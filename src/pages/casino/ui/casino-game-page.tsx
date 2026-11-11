import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { describe, items_api, type CasinoGame } from '@/shared/api';
import { use_async } from '@/shared/lib';
import { Alert, Button, Panel, Spinner } from '@/shared/ui';
import { check_draw, type DrawCheck } from '../lib/fair';
import { MODE_NAMES, value_label } from '../lib/text';
import { Coin } from './coin';
import { GameEntries } from './game-entries';
import { PotBar } from './pot-bar';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
const STATUS = { open: 'Open', done: 'Drawn', cancelled: 'Cancelled' } as const;

/** /casino/:id: a casino game, who won it, and the check of its draw */
export function CasinoGamePage() {
  const { id = '' } = useParams();
  const game = use_async(() => items_api.casino_game(id), [id]);
  const me = use_async(() => items_api.me().catch(() => null), []);
  if (game.loading && !game.data) return <Spinner />;
  if (game.error) {
    return (
      <Panel title="Casino game">
        <Alert>{describe(game.error)}</Alert>
      </Panel>
    );
  }
  const g = game.data!;
  const you = me.data?.id;
  return (
    <div className="stack">
      <Panel title={<>{MODE_NAMES[g.mode]} <span className={`tag${g.status === 'open' ? '' : ' tag--muted'}`}>{STATUS[g.status]}</span></>}>
        <div className="stack">
          <div className="item-hero">
            {g.mode === 'coinflip' && g.status === 'done' ? <Coin game={g} /> : null}
            <dl>
              <dt>Started</dt>
              <dd>{when(g.created_at)}</dd>
              {g.status !== 'open' ? (<><dt>{g.status === 'done' ? 'Drawn' : 'Cancelled'}</dt><dd>{when(g.updated_at)}</dd></>) : null}
              {g.status === 'open' && g.closes_at ? (<><dt>Drawn at</dt><dd>{when(g.closes_at)}</dd></>) : null}
              <dt>Pot</dt>
              <dd>{value_label(g.value)}</dd>
              {g.winner ? (<><dt>Winner</dt><dd>{g.winner === you ? 'You' : <Link to={`/players/${encodeURIComponent(g.winner)}`}>{g.winner_name ?? 'A player'}</Link>}</dd></>) : null}
            </dl>
          </div>
          <PotBar game={g} />
          <GameEntries game={g} me={you} />
          <div className="row">
            {g.status === 'open' ? <Button tone="grey" busy={game.loading} onClick={game.reload}>Refresh</Button> : null}
            <Link to={`/casino?tab=${g.mode === 'jackpot' ? 'jackpot' : 'coinflip'}`}>Back to the casino</Link>
          </div>
        </div>
      </Panel>
      <Fairness game={g} />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fair__row">
      <dt>{label}</dt>
      <dd className="mono">{children}</dd>
    </div>
  );
}

function Fairness({ game }: { game: CasinoGame }) {
  const [check, setCheck] = useState<DrawCheck | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      setCheck(await check_draw(game));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Check the draw">
      <p className="muted">
        The server chose a secret seed when the game opened and showed its SHA-256 at once; each stake brought its
        player's seed. The roll is the first 13 hex digits of HMAC-SHA256(key = server seed, message = game id and the
        seeds joined by ":"), times the pot's value, divided by 16<sup>13</sup>. The entry whose part of the pot holds
        the roll wins (the entries' values laid end to end, in order).
      </p>
      <dl className="fair">
        <Row label="Game">{game.id}</Row>
        <Row label="Server seed's SHA-256">{game.seed_hash}</Row>
        <Row label="Server seed">{game.server_seed ?? 'Secret until the game is over'}</Row>
        {game.entries.map((e, i) => (
          <Row key={i} label={`Seed ${i + 1}: ${e.player_name ?? 'a player'}, ${value_label(e.low)} to ${value_label(e.high)}`}>
            {e.seed}
          </Row>
        ))}
        {game.roll !== null ? <Row label="Roll">{value_label(game.roll)} of {value_label(game.value)}</Row> : null}
      </dl>
      {game.status === 'done' ? (
        <div className="row">
          <Button busy={busy} onClick={run}>Check it in your browser</Button>
        </div>
      ) : null}
      {error ? <Alert>{describe(error)}</Alert> : null}
      {check ? (
        <>
          <ul className="fair-checks">
            <li className={check.hash ? 'fair-checks--ok' : 'fair-checks--bad'}>The server seed is the one whose SHA-256 was shown from the start</li>
            <li className={check.value ? 'fair-checks--ok' : 'fair-checks--bad'}>The pot is the sum of the stakes</li>
            <li className={check.roll === game.roll ? 'fair-checks--ok' : 'fair-checks--bad'}>The roll is {value_label(check.roll)}</li>
            <li className={check.winner === game.winner ? 'fair-checks--ok' : 'fair-checks--bad'}>It falls in the winner's part of the pot</li>
          </ul>
          <Alert tone={check.ok ? 'success' : 'error'}>{check.ok ? 'The draw checks out.' : 'The draw doesn\'t check out.'}</Alert>
        </>
      ) : null}
    </Panel>
  );
}
