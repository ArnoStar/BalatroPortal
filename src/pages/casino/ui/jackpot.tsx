import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { describe, items_api, type CasinoGame, type CasinoRules, type Item, type ItemsMe } from '@/shared/api';
import { use_async } from '@/shared/lib';
import { Alert, Avatar, Button, CountUp, EmptyState, Icon, Panel, Spinner } from '@/shared/ui';
import { new_seed } from '../lib/fair';
import { value_label } from '../lib/text';
import { use_now, use_poll, use_revealed } from '../model/timers';
import { GameEntries } from './game-entries';
import { ItemPicker, picked_value } from './item-picker';
import { PotBar, Reel } from './pot-bar';
import { Confetti, ResultStage } from './result';

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** the time left before the draw, as a ring that empties */
function Countdown({ left, total }: { left: number | null; total: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const part = left === null ? 1 : Math.max(0, Math.min(1, left / total));
  const soon = left !== null && left < 10_000;
  return (
    <div className={`countdown${soon ? ' countdown--soon' : ''}${left === null ? ' countdown--idle' : ''}`}>
      <svg viewBox="0 0 72 72" aria-hidden>
        <circle className="countdown__track" cx="36" cy="36" r={r} />
        <circle className="countdown__fill" cx="36" cy="36" r={r} strokeDasharray={`${part * c} ${c}`} />
      </svg>
      {left === null ? (
        <span className="countdown__text">
          <Icon name="users" />
        </span>
      ) : left > 0 ? (
        <span className="countdown__text" role="timer" aria-label="Drawn in">
          {clock(left)}
        </span>
      ) : (
        <span className="countdown__text">…</span>
      )}
    </div>
  );
}

export function Jackpot({ me, rules, mine, canPlay, onItems }: {
  me: ItemsMe; rules: CasinoRules; mine: Item[]; canPlay: boolean; onItems: () => void;
}) {
  const state = use_async(() => items_api.jackpot(), []);
  use_poll(state.reload, 2000);
  const [offset, setOffset] = useState(0); // the service's clock minus this one
  const now = use_now(250) + offset;
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [drawn, setDrawn] = useState<CasinoGame | null>(null);

  // the pot we saw is gone and drawn: show the draw
  const seen = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const d = state.data;
    if (!d) return;
    setOffset(Date.parse(d.now) - Date.now());
    const before = seen.current;
    seen.current = d.round?.id ?? null;
    if (before && d.round?.id !== before && d.last?.id === before) {
      setDrawn(d.last);
      onItems();
    }
  }, [state.data, onItems]);

  async function act(key: string, run: () => Promise<CasinoGame>) {
    setBusy(key);
    setError(null);
    try {
      await run();
      setPicked([]);
      state.reload();
      onItems();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }

  if (state.loading && !state.data) return <Spinner />;
  if (state.error && !state.data) return <Alert>{describe(state.error)}</Alert>;
  const { round, last } = state.data!;
  const value = picked_value(mine, picked);
  const in_pot = round?.entries.filter((e) => e.player === me.id).reduce((sum, e) => sum + e.value, 0) ?? 0;
  const chance = value ? Math.round((1000 * (in_pot + value)) / ((round?.value ?? 0) + value)) / 10 : null;
  const players = round ? new Set(round.entries.map((e) => e.player)) : new Set<string>();
  const alone = players.size === 1 && players.has(me.id);
  const left = round?.closes_at ? Date.parse(round.closes_at) - now : null;
  const your_share = round && in_pot ? Math.round((1000 * in_pot) / round.value) / 10 : null;

  return (
    <>
      {drawn ? <DrawResult game={drawn} me={me.id} onClose={() => setDrawn(null)} /> : null}
      <Panel title="The pot" icon="coins" className="pot">
        {round ? (
          <div className="stack">
            <div className="pot__head">
              <div className="pot__total">
                <span className="eyebrow">In the pot</span>
                <strong>
                  <CountUp value={round.value} format={value_label} />
                </strong>
              </div>
              <dl className="pot__facts">
                <div>
                  <dt>Players</dt>
                  <dd>
                    {players.size} <small>of {rules.jackpot_max_players}</small>
                  </dd>
                </div>
                <div>
                  <dt>Items</dt>
                  <dd>
                    {round.entries.reduce((n, e) => n + e.items.length, 0)} <small>of {rules.jackpot_max_items}</small>
                  </dd>
                </div>
                {your_share !== null ? (
                  <div>
                    <dt>Your chance</dt>
                    <dd className="win">{your_share}%</dd>
                  </div>
                ) : null}
              </dl>
              <div className="pot__clock">
                <Countdown left={left} total={rules.jackpot_seconds * 1000} />
                <span className="muted">{left === null ? 'Waiting for a second player' : left > 0 ? 'until the draw' : 'Drawing…'}</span>
              </div>
            </div>
            <PotBar game={round} />
            <GameEntries game={round} me={me.id} />
            {alone ? (
              <div className="row">
                <Button tone="grey" busy={busy === 'leave'} onClick={() => act('leave', () => items_api.leave_jackpot())} icon={<Icon name="refresh" />}>
                  Take my items back
                </Button>
                <span className="muted">Only while nobody else is in.</span>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState icon="coins" title="The pot is empty">
            Put items in to open it.
          </EmptyState>
        )}
      </Panel>
      <Panel title="Put items in the pot" icon="gift">
        <p className="muted">
          Once a second player is in, the pot is drawn {rules.jackpot_seconds} seconds later. One player takes it all: your
          chance is your share of the pot's value.
        </p>
        <ItemPicker items={mine} picked={picked} onChange={setPicked} max={rules.max_items} />
        <div className="picked picked--bar">
          <span>
            {picked.length} item{picked.length === 1 ? '' : 's'}, worth <strong>{value_label(value)}</strong>
          </span>
          {chance !== null ? (
            <span>
              Your chance then: <strong className="win">{chance}%</strong>
            </span>
          ) : null}
          <Button
            busy={busy === 'join'}
            disabled={!canPlay || !picked.length}
            icon={<Icon name="coins" />}
            onClick={() => act('join', () => items_api.join_jackpot({ items: picked, seed: new_seed() }))}
          >
            Put them in
          </Button>
        </div>
        {error ? <Alert>{describe(error)}</Alert> : null}
      </Panel>
      {last && last.id !== drawn?.id ? (
        <Panel
          title="The last pot"
          icon="history"
          actions={
            <Link to={`/casino/${last.id}`} viewTransition>
              Check the draw
            </Link>
          }
        >
          <p className="last-pot">
            <Avatar name={last.winner === me.id ? 'You' : last.winner_name} seed={last.winner_name} size="sm" />
            <span>
              <strong>{last.winner === me.id ? 'You' : (last.winner_name ?? 'A player')}</strong> took {value_label(last.value)} with a{' '}
              {last.entries.filter((e) => e.player === last.winner).reduce((s, e) => s + e.chance, 0).toFixed(1)}% chance.
            </span>
          </p>
          <PotBar game={last} />
        </Panel>
      ) : null}
    </>
  );
}

function DrawResult({ game, me, onClose }: { game: CasinoGame; me: string; onClose: () => void }) {
  const shown = use_revealed(game.id, 5300);
  const won = game.winner === me;
  const was_in = game.entries.some((e) => e.player === me);
  return (
    <ResultStage title="The pot is drawn" tone={shown ? (won ? 'win' : was_in ? 'loss' : 'none') : 'none'} onClose={onClose}>
      {shown && won ? <Confetti /> : null}
      <p className="eyebrow">
        <Icon name="coins" /> The pot is drawn
      </p>
      <Reel game={game} />
      <div className="stage__text" aria-live="polite">
        {shown ? (
          <p className={`stage__result ${won ? 'win' : was_in ? 'loss' : ''}`}>
            {won ? `You take the pot: ${value_label(game.value)}!` : `${game.winner_name ?? 'A player'} takes the pot (${value_label(game.value)}).`}
          </p>
        ) : (
          <p className="stage__result muted">Drawing…</p>
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
