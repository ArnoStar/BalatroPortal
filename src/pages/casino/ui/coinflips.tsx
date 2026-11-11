import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ItemArt, item_label } from '@/entities/item';
import { describe, items_api, type CasinoGame, type CasinoRules, type Item, type ItemsMe, type Side } from '@/shared/api';
import { use_async } from '@/shared/lib';
import { Alert, Button, Panel, Spinner } from '@/shared/ui';
import { new_seed } from '../lib/fair';
import { SIDE_NAMES, value_label } from '../lib/text';
import { use_poll, use_revealed } from '../model/timers';
import { Coin } from './coin';
import { GameEntries } from './game-entries';
import { ItemPicker, picked_value } from './item-picker';

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
      <div className="picked">
        <span>
          {picked.length} item{picked.length === 1 ? '' : 's'}, worth <strong>{value_label(value)}</strong>
          {joining ? <> (needed: {value_label(joining.join_min ?? 0)} to {value_label(joining.join_max ?? 0)})</> : null}
        </span>
      </div>
    </>
  );

  return (
    <>
      {result ? <FlipResult game={result} me={me.id} onClose={() => setResult(null)} /> : null}
      <Panel title="Open coinflips">
        <p className="muted">
          Match a coinflip with items worth about as much ({rules.coinflip_margin}% more or less): the coin is flipped at
          once, and the winner takes every item. Your chance is your share of the pot.
        </p>
        <div className="row">
          <Button tone="orange" disabled={!canPlay} onClick={() => pick(picking?.kind === 'create' ? null : { kind: 'create' })}>
            {picking?.kind === 'create' ? 'Never mind' : 'Start a coinflip'}
          </Button>
        </div>
        {picking?.kind === 'create' ? (
          <section className="stack" aria-label="Start a coinflip">
            <div className="segmented" role="group" aria-label="Your side">
              {(['chips', 'mult'] as const).map((s) => (
                <button key={s} type="button" className={`segmented__item side-pick side-pick--${s}`} aria-pressed={side === s} onClick={() => setSide(s)}>
                  {SIDE_NAMES[s]}
                </button>
              ))}
            </div>
            {picker}
            <div className="row">
              <Button busy={busy === 'create'} disabled={!picked.length}
                onClick={() => act('create', () => items_api.create_coinflip({ items: picked, side, seed: new_seed() }))}>
                Stake {picked.length || ''} on {SIDE_NAMES[side]}
              </Button>
            </div>
          </section>
        ) : null}
        {error ? <Alert>{describe(error)}</Alert> : null}
        {flips.loading && !flips.data ? <Spinner /> : null}
        {flips.error ? <Alert>{describe(flips.error)}</Alert> : null}
        {flips.data?.length === 0 ? <p className="muted">No coinflip is waiting: start one!</p> : null}
        <ul className="flips">
          {flips.data?.map((g) => {
            const entry = g.entries[0];
            const mine_ = entry?.player === me.id;
            const open = joining?.id === g.id;
            return (
              <li key={g.id} className="flip">
                <div className="flip__head">
                  <strong>{mine_ ? 'You' : <Link to={`/players/${encodeURIComponent(entry.player)}`}>{entry.player_name ?? 'A player'}</Link>}</strong>
                  {g.side ? <span className={`side side--${g.side}`}>{SIDE_NAMES[g.side]}</span> : null}
                  <span>Worth <strong>{value_label(g.value)}</strong></span>
                  <span className="muted">Match with {value_label(g.join_min ?? 0)} to {value_label(g.join_max ?? 0)}</span>
                  <Link to={`/casino/${g.id}`} className="muted">Details</Link>
                </div>
                <ul className="flip__items">
                  {entry?.items.map((it) => (
                    <li key={it.id}>
                      <Link to={`/item/${it.id}`} title={item_label(it)}><ItemArt item={it} scale={0.8} /></Link>
                    </li>
                  ))}
                </ul>
                <div className="row">
                  {mine_ ? (
                    <Button tone="grey" busy={busy === g.id} onClick={() => act(g.id, () => items_api.cancel_coinflip(g.id))}>
                      Take my items back
                    </Button>
                  ) : (
                    <Button tone={open ? 'grey' : 'green'} disabled={!canPlay} onClick={() => pick(open ? null : { kind: 'join', game: g })}>
                      {open ? 'Never mind' : 'Match it'}
                    </Button>
                  )}
                </div>
                {open ? (
                  <section className="stack" aria-label="Match this coinflip">
                    {picker}
                    <div className="row">
                      <Button tone="green" busy={busy === 'join'} disabled={!fits}
                        onClick={() => act('join', () => items_api.join_coinflip(g.id, { items: picked, seed: new_seed() }), setResult)}>
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
    <Panel title="The coin is flipped">
      <div className="stack">
        <div className="flip-result">
          <Coin game={game} flip />
          <div className="stack" aria-live="polite">
            {shown ? (
              <p className={`flip-result__text ${won ? 'win' : 'loss'}`}>
                {won ? `You win ${count} items, worth ${value_label(game.value)}!` : `${game.winner_name ?? 'The other player'} wins.`}
              </p>
            ) : (
              <p className="flip-result__text muted">Flipping…</p>
            )}
            {shown ? <Link to={`/casino/${game.id}`}>Check the draw</Link> : null}
          </div>
        </div>
        {shown ? <GameEntries game={game} me={me} /> : null}
        <div className="row">
          <Button tone="grey" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Panel>
  );
}
