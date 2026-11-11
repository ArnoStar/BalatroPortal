import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { describe, items_api, type CasinoGame } from '@/shared/api';
import { use_async } from '@/shared/lib';
import { Alert, Avatar, Button, Icon, PageHeader, Panel, Spinner } from '@/shared/ui';
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
      <Panel title="Casino game" icon="dice">
        <Alert>{describe(game.error)}</Alert>
      </Panel>
    );
  }
  const g = game.data!;
  const you = me.data?.id;
  return (
    <div className="stack casino">
      <PageHeader
        eyebrow={
          <Link to={`/casino?tab=${g.mode === 'jackpot' ? 'jackpot' : 'coinflip'}`} className="back" viewTransition>
            <Icon name="chevron-left" /> Casino
          </Link>
        }
        title={
          <>
            {MODE_NAMES[g.mode]}{' '}
            <span className={`status status--${g.status === 'open' ? 'live' : g.status === 'done' ? 'won' : 'lost'}`}>
              <Icon name={g.status === 'open' ? 'dot' : g.status === 'done' ? 'check-circle' : 'x-circle'} />
              {STATUS[g.status]}
            </span>
          </>
        }
        actions={
          g.status === 'open' ? (
            <Button tone="grey" busy={game.loading} onClick={game.reload} icon={<Icon name="refresh" />}>
              Refresh
            </Button>
          ) : null
        }
      />
      <Panel>
        <div className="game-head">
          {g.mode === 'coinflip' && g.status === 'done' ? <Coin game={g} /> : null}
          <dl className="specs game-head__specs">
            <div>
              <dt>Started</dt>
              <dd>{when(g.created_at)}</dd>
            </div>
            {g.status !== 'open' ? (
              <div>
                <dt>{g.status === 'done' ? 'Drawn' : 'Cancelled'}</dt>
                <dd>{when(g.updated_at)}</dd>
              </div>
            ) : null}
            {g.status === 'open' && g.closes_at ? (
              <div>
                <dt>Drawn at</dt>
                <dd>{when(g.closes_at)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Pot</dt>
              <dd>
                <strong>{value_label(g.value)}</strong>
              </dd>
            </div>
            {g.winner ? (
              <div>
                <dt>Winner</dt>
                <dd>
                  {g.winner === you ? (
                    <strong className="win">You</strong>
                  ) : (
                    <span className="who">
                      <Avatar name={g.winner_name} size="sm" />
                      <Link to={`/players/${encodeURIComponent(g.winner)}`} viewTransition>
                        {g.winner_name ?? 'A player'}
                      </Link>
                    </span>
                  )}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
        <div className="stack">
          <PotBar game={g} />
          <GameEntries game={g} me={you} />
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
    <Panel
      title="Check the draw"
      icon="shield"
      actions={
        game.status === 'done' ? (
          <Button busy={busy} onClick={run} icon={<Icon name="shield" />}>
            Check it in your browser
          </Button>
        ) : null
      }
    >
      <p className="muted">
        The server chose a secret seed when the game opened and showed its SHA-256 at once; each stake brought its player's seed. The roll is the
        first 13 hex digits of HMAC-SHA256(key = server seed, message = game id and the seeds joined by ":"), times the pot's value, divided by
        16<sup>13</sup>. The entry whose part of the pot holds the roll wins (the entries' values laid end to end, in order).
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
        {game.roll !== null ? (
          <Row label="Roll">
            {value_label(game.roll)} of {value_label(game.value)}
          </Row>
        ) : null}
      </dl>
      {error ? <Alert>{describe(error)}</Alert> : null}
      {check ? (
        <>
          <ul className="fair-checks">
            <Check ok={check.hash}>The server seed is the one whose SHA-256 was shown from the start</Check>
            <Check ok={check.value}>The pot is the sum of the stakes</Check>
            <Check ok={check.roll === game.roll}>The roll is {value_label(check.roll)}</Check>
            <Check ok={check.winner === game.winner}>It falls in the winner's part of the pot</Check>
          </ul>
          <Alert tone={check.ok ? 'success' : 'error'}>{check.ok ? 'The draw checks out.' : "The draw doesn't check out."}</Alert>
        </>
      ) : null}
    </Panel>
  );
}

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={ok ? 'fair-checks--ok' : 'fair-checks--bad'}>
      <Icon name={ok ? 'check-circle' : 'x-circle'} />
      <span>
        {children}
        <span className="visually-hidden">{ok ? ': yes' : ': no'}</span>
      </span>
    </li>
  );
}
