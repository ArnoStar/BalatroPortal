import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ItemArt, item_label } from '@/entities/item';
import { describe, items_api, type CasinoGame, type CasinoRules, type Item, type ItemsMe, type Side } from '@/shared/api';
import { use_async } from '@/shared/lib';
import { Alert, Avatar, Button, EmptyState, Icon, Panel, Segmented, Spinner } from '@/shared/ui';
import { new_seed } from '../lib/fair';
import { SIDE_NAMES, value_label } from '../lib/text';
import { use_poll, use_revealed } from '../model/timers';
import { Coin } from './coin';
import { GameEntries } from './game-entries';
import { ItemPicker, picked_value } from './item-picker';
import { Confetti, ResultStage } from './result';

type Picking = { kind: 'create' } | { kind: 'join'; game: CasinoGame } | null;

export function Coinflips({ me, rules, mine, canPlay, onItems }: {
  me: ItemsMe; rules: CasinoRules; mine: Item[]; canPlay: boolean; onItems: () => void;
}) {
  const flips = use_async(() => items_api.coinflips(), []);
  use_poll(flips.reload, 4000);
  const [picking, setPicking] = useState<Picking>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [side, setSide] = useState<Side>('chips');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<CasinoGame | null>(null);

  // a coinflip of yours that another player matched: show how the coin landed
  const yours = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!flips.data) return;
    const open = new Set(flips.data.filter((g) => g.entries[0]?.player === me.id).map((g) => g.id));
    const gone = yours.current ? [...yours.current].filter((id) => !open.has(id)) : [];
    yours.current = open;
    for (const id of gone) {
      items_api.casino_game(id).then((g) => {
        if (g.status === 'done') {
          setResult(g);
          onItems();
        }
      }, () => undefined);
    }
  }, [flips.data, me.id, onItems]);

  function pick(p: Picking) {
    setPicking(p);
    setPicked([]);
    setError(null);
  }

  async function act(key: string, run: () => Promise<CasinoGame>, after?: (g: CasinoGame) => void) {
    setBusy(key);
    setError(null);
    try {
      const g = await run();
      after?.(g);
      pick(null);
      flips.reload();
      onItems();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }

  const value = picked_value(mine, picked);
  const joining = picking?.kind === 'join' ? picking.game : null;
  const fits = joining ? value >= (joining.join_min ?? 0) && value <= (joining.join_max ?? 0) : value > 0;
  const picker = (
    <>
      <ItemPicker items={mine} picked={picked} onChange={setPicked} max={rules.max_items} />
      <p className="picked">
        <span>
          {picked.length} item{picked.length === 1 ? '' : 's'}, worth <strong>{value_label(value)}</strong>
        </span>
        {joining ? (
          <span className={fits ? 'win' : 'muted'}>
            {fits ? <Icon name="check" /> : null} needed: {value_label(joining.join_min ?? 0)} to {value_label(joining.join_max ?? 0)}
          </span>
        ) : null}
      </p>
    </>
  );

  return (
    <>
      {result ? <FlipResult game={result} me={me.id} onClose={() => setResult(null)} /> : null}
      <Panel
        title="Open coinflips"
        icon="coins"
        actions={
          <Button tone={picking?.kind === 'create' ? 'grey' : 'orange'} disabled={!canPlay} onClick={() => pick(picking?.kind === 'create' ? null : { kind: 'create' })} icon={<Icon name={picking?.kind === 'create' ? 'close' : 'coins'} />}>
            {picking?.kind === 'create' ? 'Never mind' : 'Start a coinflip'}
          </Button>
        }
      >
        <p className="muted">
          Match a coinflip with items worth about as much ({rules.coinflip_margin}% more or less): the coin is flipped at
          once, and the winner takes every item. Your chance is your share of the pot.
        </p>
        {picking?.kind === 'create' ? (
          <section className="flip-new" aria-label="Start a coinflip">
            <div className="flip-new__side">
              <Coin side={side} size="sm" />
              <div className="stack stack--tight">
                <span className="muted">Your side</span>
                <Segmented
                  label="Your side"
                  value={side}
                  onChange={setSide}
                  options={[
                    ['chips', SIDE_NAMES.chips, 'chips'],
                    ['mult', SIDE_NAMES.mult, 'mult'],
                  ]}
                />
              </div>
            </div>
            {picker}
            <div className="row">
              <Button
                busy={busy === 'create'}
                disabled={!picked.length}
                icon={<Icon name="coins" />}
                onClick={() => act('create', () => items_api.create_coinflip({ items: picked, side, seed: new_seed() }))}
              >
                Stake {picked.length || ''} on {SIDE_NAMES[side]}
              </Button>
            </div>
          </section>
        ) : null}
        {error ? <Alert>{describe(error)}</Alert> : null}
        {flips.loading && !flips.data ? <Spinner /> : null}
        {flips.error ? <Alert>{describe(flips.error)}</Alert> : null}
        {flips.data?.length === 0 ? <EmptyState icon="coins" title="No coinflip is waiting" >Start one!</EmptyState> : null}
        <ul className="flips">
          {flips.data?.map((g) => {
            const entry = g.entries[0];
            const yours_ = entry?.player === me.id;
            const open = joining?.id === g.id;
            return (
              <li key={g.id} className={`flip${open ? ' flip--open' : ''}${yours_ ? ' flip--yours' : ''}`}>
                <div className="flip__main">
                  {g.side ? <Coin side={g.side} size="sm" /> : null}
                  <div className="flip__text">
                    <span className="who">
                      <Avatar name={entry.player_name} size="sm" />
                      <strong>
                        {yours_ ? (
                          'You'
                        ) : (
                          <Link to={`/players/${encodeURIComponent(entry.player)}`} viewTransition>
                            {entry.player_name ?? 'A player'}
                          </Link>
                        )}
                      </strong>
                      {g.side ? <span className={`side side--${g.side}`}>{SIDE_NAMES[g.side]}</span> : null}
                    </span>
                    <span className="flip__value">
                      Worth <strong>{value_label(g.value)}</strong>
                    </span>
                    <span className="muted">
                      Match with {value_label(g.join_min ?? 0)} to {value_label(g.join_max ?? 0)} ·{' '}
                      <Link to={`/casino/${g.id}`} viewTransition>
                        Details
                      </Link>
                    </span>
                  </div>
                  <ul className="flip__items">
                    {entry?.items.map((it) => (
                      <li key={it.id}>
                        <Link to={`/item/${it.id}`} title={item_label(it)} viewTransition>
                          <ItemArt item={it} scale={0.8} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="flip__action">
                    {yours_ ? (
                      <Button tone="grey" busy={busy === g.id} onClick={() => act(g.id, () => items_api.cancel_coinflip(g.id))} icon={<Icon name="refresh" />}>
                        Take my items back
                      </Button>
                    ) : (
                      <Button tone={open ? 'grey' : 'green'} disabled={!canPlay} onClick={() => pick(open ? null : { kind: 'join', game: g })} icon={<Icon name={open ? 'close' : 'zap'} />}>
                        {open ? 'Never mind' : 'Match it'}
                      </Button>
                    )}
                  </div>
                </div>
                {open ? (
                  <section className="flip__join" aria-label="Match this coinflip">
                    {picker}
                    <div className="row">
                      <Button
                        tone="green"
                        size="lg"
                        busy={busy === 'join'}
                        disabled={!fits}
                        icon={<Icon name="coins" />}
                        onClick={() => act('join', () => items_api.join_coinflip(g.id, { items: picked, seed: new_seed() }), setResult)}
                      >
                        Flip the coin
                      </Button>
                    </div>
                  </section>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}

function FlipResult({ game, me, onClose }: { game: CasinoGame; me: string; onClose: () => void }) {
  const shown = use_revealed(game.id, 2600);
  const won = game.winner === me;
  const count = game.entries.reduce((n, e) => n + e.items.length, 0);
  return (
    <ResultStage title="The coin is flipped" tone={shown ? (won ? 'win' : 'loss') : 'none'} onClose={onClose}>
      {shown && won ? <Confetti /> : null}
      <Coin game={game} flip />
      <div className="stage__text" aria-live="polite">
        {shown ? (
          <p className={`stage__result ${won ? 'win' : 'loss'}`}>
            {won ? `You win ${count} items, worth ${value_label(game.value)}!` : `${game.winner_name ?? 'The other player'} wins.`}
          </p>
        ) : (
          <p className="stage__result muted">Flipping…</p>
        )}
        {shown ? (
          <Link to={`/casino/${game.id}`} viewTransition>
            Check the draw
          </Link>
        ) : null}
      </div>
      {shown ? <GameEntries game={game} me={me} /> : null}
    </ResultStage>
  );
}
