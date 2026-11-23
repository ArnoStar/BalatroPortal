import { Link } from 'react-router';
import { DeckGlyph, deck_name, stake_name } from '@/entities/catalog';
import type { MatchHistoryEntry, MatchOpponentStats, MultiplayerStats } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { format_number, format_percent, time_ago } from '@/shared/lib';
import { AnchorButton, Avatar, EmptyState, Icon, Panel, StatTile } from '@/shared/ui';
import { fmt_datetime, fmt_number, hand_name, t, tp } from '@/shared/i18n';

const when = { format: (d: Date) => fmt_datetime(d) };

/**
 * A player's PvP and coop matches (BalatroWebAPI's /matches): their numbers,
 * the players they played most with, and their latest matches. `you`: the
 * runs can be watched again (a match's players may watch each other's).
 */
export function MultiplayerPanel({ stats, matches, you }: { stats: MultiplayerStats | null; matches: MatchHistoryEntry[]; you: boolean }) {
  const played = (stats?.pvp.played ?? 0) + (stats?.coop.played ?? 0);
  return (
    <Panel
      title={t('Multiplayer')}
      icon="users"
      actions={
        you ? (
          <AnchorButton href={`${GAME_URL}/`} tone="grey" size="sm" icon={<Icon name="play" />}>
            {t('Play a match')}
          </AnchorButton>
        ) : null
      }
    >
      {!stats || !played ? (
        <EmptyState icon="users" title={t('No match yet')}>
          {you ? t('PvP and coop matches are in the game’s MULTIPLAYER menu.') : null}
        </EmptyState>
      ) : (
        <div className="stack">
          <Numbers s={stats} />
          <div className="mp-people">
            <People title={t('Rivals')} list={stats.rivals} line={(o) => t('{w} won, {l} lost', { w: o.won, l: o.lost })} />
            <People title={t('Partners')} list={stats.partners} line={(o) => t('best ante {n}', { n: o.best_ante })} />
          </div>
          {matches.length ? (
            <>
              <h3 className="subhead">{t('Latest matches')}</h3>
              <ul className="runs">
                {matches.map((m) => (
                  <MatchCard key={m.id} m={m} watch={you} />
                ))}
              </ul>
            </>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

function Numbers({ s }: { s: MultiplayerStats }) {
  const { pvp, coop } = s;
  const finished = pvp.won + pvp.lost + pvp.drawn;
  return (
    <section className="tiles" aria-label={t('Multiplayer numbers')}>
      <StatTile icon="swap" accent="red" label={t('PvP record')} value={`${pvp.won} – ${pvp.lost}`}
        hint={finished ? t('{rate} won, {n} drawn', { rate: format_percent(pvp.won, finished), n: pvp.drawn }) : undefined} />
      <StatTile icon="flame" accent="orange" label={t('Best PvP streak')} value={fmt_number(pvp.best_streak)}
        hint={pvp.streak ? tp(pvp.streak, '# win in a row now', '# wins in a row now') : undefined} />
      <StatTile icon="users" accent="blue" label={t('Coop runs')} value={fmt_number(coop.played)}
        hint={coop.runs_won ? tp(coop.runs_won, '# won', '# won') : undefined} />
      <StatTile icon="target" accent="gold" label={t('Best coop ante')} value={fmt_number(coop.best_ante)}
        hint={coop.best_hand_name ? t('best hand {n} ({hand})', { n: format_number(coop.best_hand), hand: hand_name(coop.best_hand_name) }) : undefined} />
    </section>
  );
}

function People({ title, list, line }: { title: string; list: MatchOpponentStats[]; line: (o: MatchOpponentStats) => string }) {
  return (
    <div>
      <h3 className="subhead">{title}</h3>
      {list.length ? (
        <ul className="people">
          {list.map((o) => (
            <li key={o.id} className="person">
              <Avatar name={o.name} player={o.id} size="sm" className="person__avatar" />
              <span className="person__info">
                <Link className="person__name" to={`/players/${encodeURIComponent(o.id)}`} viewTransition>
                  {o.name ?? t('A player')}
                </Link>
                <span className="person__status">
                  {tp(o.played, '# match', '# matches')} · {line(o)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{t('Nobody yet.')}</p>
      )}
    </div>
  );
}

/** won, lost, or neither (a draw, a coop run) */
function match_state(m: MatchHistoryEntry) {
  if (m.mode === 'coop') return m.summary?.run_won ? 'won' : 'lost';
  return m.result.winner === null ? 'live' : m.result.you_won ? 'won' : 'lost';
}

function MatchCard({ m, watch }: { m: MatchHistoryEntry; watch: boolean }) {
  const other = m.players.find((p) => p.seat !== m.seat);
  const state = match_state(m);
  const me = m.summary?.players.find((p) => p.seat === m.seat);
  const them = m.summary?.players.find((p) => p.seat !== m.seat);
  const status = m.mode === 'coop'
    ? m.summary?.run_won ? t('Run won') : t('Game over')
    : m.result.winner === null ? t('Draw') : m.result.you_won ? t('Victory') : t('Defeat');
  const mine = m.runs[m.seat], theirs = m.runs.find((r, i) => i !== m.seat && r !== mine) ?? null;
  return (
    <li className={`run-card run-card--${state}`}>
      <DeckGlyph deck={m.settings.deck} />
      <div className="run-card__info">
        <div className="run-card__title">
          <span className={`tag tag--${m.mode}`}>{m.mode === 'pvp' ? t('PvP') : t('Coop')}</span>
          <strong className="mp-with">
            {m.mode === 'pvp' ? t('against') : t('with')}
            <Avatar name={other?.name} player={other?.id} size="sm" />
            {other?.id ? (
              <Link to={`/players/${encodeURIComponent(other.id)}`} viewTransition>
                {other.name ?? t('A player')}
              </Link>
            ) : (
              other?.name ?? t('A player')
            )}
          </strong>
          <span className="tag tag--muted">{deck_name(m.settings.deck)}</span>
          <span className={`stake stake--${m.settings.stake}`}>{stake_name(m.settings.stake)}</span>
        </div>
        {m.summary ? (
          <dl className="run-card__stats">
            <div>
              <dt>{t('Ante')}</dt>
              <dd>{m.summary.ante}</dd>
            </div>
            {m.mode === 'pvp' ? (
              <>
                <div>
                  <dt>{t('HP')}</dt>
                  <dd>
                    {me?.hp ?? '?'} – {them?.hp ?? '?'}
                  </dd>
                </div>
              </>
            ) : (
              <>
                <div>
                  <dt>{t('Round')}</dt>
                  <dd>{m.summary.rounds}</dd>
                </div>
                <div>
                  <dt>{t('Your chips')}</dt>
                  <dd>{format_number(me?.chips ?? 0)}</dd>
                </div>
              </>
            )}
            <div>
              <dt>{t('Best hand')}</dt>
              <dd>{format_number(me?.best_hand ?? 0)}</dd>
            </div>
          </dl>
        ) : null}
        <div className="run-card__meta">
          {m.finished_at ? (
            <time dateTime={m.finished_at} title={when.format(new Date(m.finished_at))}>
              {time_ago(m.finished_at)}
            </time>
          ) : null}
          {m.seed ? <span>{t('Seed {seed}', { seed: m.seed })}</span> : null}
        </div>
      </div>
      <div className="run-card__side">
        <span className={`status status--${state}`}>
          <Icon name={state === 'won' ? 'check-circle' : state === 'lost' ? 'x-circle' : 'dot'} />
          {status}
        </span>
        {watch && mine ? (
          <div className="run-card__actions">
            <a className="btn btn--grey btn--sm" href={`${GAME_URL}/?watch=${encodeURIComponent(mine)}`}>
              <Icon name="eye" />
              {m.mode === 'pvp' ? t('Your run') : t('Watch')}
            </a>
            {theirs ? (
              <a className="btn btn--grey btn--sm" href={`${GAME_URL}/?watch=${encodeURIComponent(theirs)}`}>
                <Icon name="eye" />
                {t('Their run')}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
