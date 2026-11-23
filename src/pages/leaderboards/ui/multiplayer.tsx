import { Fragment, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { DeckGlyph, deck_name } from '@/entities/catalog';
import {
  COOP_BOARDS, PVP_BOARDS, describe, game_api, type MultiplayerBoardName, type MultiplayerGlobalStats, type MultiplayerLeaderboardEntry,
} from '@/shared/api';
import { format_number, time_ago, use_async } from '@/shared/lib';
import {
  Alert, Avatar, BarList, ColumnChart, CountUp, EmptyState, Icon, Panel, Segmented, Spinner, StatTile, type IconName,
} from '@/shared/ui';
import { current_lang, fmt_date, fmt_number, hand_name, N_, t, tp } from '@/shared/i18n';

type Kind = 'coop' | 'pvp';
type Board = (typeof COOP_BOARDS)[number] | (typeof PVP_BOARDS)[number];

const BOARDS_OF: Record<Kind, readonly Board[]> = { coop: COOP_BOARDS, pvp: PVP_BOARDS };
// (the coop boards are the solo ones, for a pair)
const TITLES: Record<Board, string> = {
  coop_best_hand: N_('Best hand'), coop_ante: N_('Highest ante'), coop_round: N_('Highest round'), coop_money: N_('Most money'),
  coop_boss_streak: N_('Bosses in a row'), coop_wins: N_('Wins'), pvp_wins: N_('Wins'), pvp_streak: N_('Wins in a row'),
};
const ICONS: Record<Board, IconName> = {
  coop_best_hand: 'zap', coop_ante: 'target', coop_round: 'layers', coop_money: 'coins', coop_boss_streak: 'flame', coop_wins: 'trophy',
  pvp_wins: 'trophy', pvp_streak: 'flame',
};
const ABOUT: Record<Board, string> = {
  coop_best_hand: N_('The best single hand of each pair’s coop runs, whichever of the two played it.'),
  coop_ante: N_('The furthest ante each pair reached together, then the round.'),
  coop_round: N_('The furthest round each pair reached together.'),
  coop_money: N_('The most money each pair had at once in a coop run.'),
  coop_boss_streak: N_('The most boss blinds each pair beat in a row in a coop run.'),
  coop_wins: N_('The coop runs each pair won (ante 8 beaten).'),
  pvp_wins: N_('PvP matches won.'),
  pvp_streak: N_('The most PvP matches won in a row.'),
};

const day = { format: (d: Date) => new Intl.DateTimeFormat(current_lang(), { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(d) };

function value_of(board: Board, e: MultiplayerLeaderboardEntry) {
  return board === 'coop_money' ? `$${format_number(e.value)}` : format_number(e.value);
}

/** what goes with the value: the runs or matches played, the run's round, the hand */
function meta_of(board: Board, e: MultiplayerLeaderboardEntry) {
  if (board.startsWith('pvp')) return tp(e.played, '# PvP match', '# PvP matches');
  const together = tp(e.played, '# run together', '# runs together');
  if (board === 'coop_ante') return `${t('round {n}', { n: fmt_number(e.rounds ?? 0) })} · ${together}`;
  if (board === 'coop_best_hand' && e.hand) return `${hand_name(e.hand)} · ${together}`;
  return together;
}

/** the player, or the coop pair, each with their profile */
function Who({ e }: { e: MultiplayerLeaderboardEntry }) {
  return (
    <>
      {e.players.map((p, i) => (
        <Fragment key={p.id}>
          {i ? <span className="muted"> & </span> : null}
          <Link to={`/players/${encodeURIComponent(p.id)}`} viewTransition>
            {p.name ?? t('Anonymous')}
          </Link>
        </Fragment>
      ))}
      {e.you ? <span className="tag tag--you">{t('You')}</span> : null}
    </>
  );
}

function Avatars({ e, size }: { e: MultiplayerLeaderboardEntry; size: 'sm' | 'lg' }) {
  return (
    <span className={e.players.length > 1 ? 'mp-pair' : undefined}>
      {e.players.map((p) => (
        <Avatar key={p.id} name={p.name} player={p.id} size={size} />
      ))}
    </span>
  );
}

/** The best of everyone's coop pairs and PvP players. */
export function MultiplayerBoards() {
  const [kind, setKind] = useState<Kind>('coop');
  const [board, setBoard] = useState<Board>('coop_best_hand');
  const choose_kind = (k: Kind) => { setKind(k); setBoard(BOARDS_OF[k][0]); };
  const { data, error, loading } = use_async(() => game_api.multiplayer_leaderboard(board as MultiplayerBoardName), [board]);
  const pairs = kind === 'coop';
  const podium = data?.entries.slice(0, 3) ?? [];
  const rest = data?.entries.slice(3) ?? [];
  const you_apart = data?.you && !data.entries.some((e) => e.you) ? data.you : null;
  return (
    <Panel>
      <div className="filters">
        <Segmented
          label={t('Mode')}
          value={kind}
          onChange={choose_kind}
          options={[
            ['coop', <><Icon name="users" /> {t('Coop pairs')}</>],
            ['pvp', <><Icon name="swap" /> {t('PvP')}</>],
          ] as const}
        />
        <Segmented
          label={t('Leaderboard')}
          value={board}
          onChange={setBoard}
          options={BOARDS_OF[kind].map((b) => [b, <><Icon name={ICONS[b]} /> {t(TITLES[b])}</>] as const)}
        />
      </div>
      <p className="muted">{t(ABOUT[board])}</p>
      {error ? <Alert>{describe(error)}</Alert> : null}
      {loading && !data ? <Spinner /> : null}
      {data ? (
        <div className={loading ? 'refreshing' : undefined}>
          {data.entries.length ? (
            <>
              <ol className="podium" aria-label={t('The first three')}>
                {podium.map((e, i) => (
                  <li key={`${e.rank}-${i}`} className={`podium__place podium__place--${i + 1}${e.you ? ' is-you' : ''}`} style={{ '--i': i, '--medal': `var(--medal-${Math.min(e.rank, 3)})` } as CSSProperties}>
                    <div className="podium__who">
                      {e.rank === 1 ? <Icon name="crown" className="podium__crown" /> : null}
                      <Avatars e={e} size="lg" />
                      <span className="podium__name">
                        <Who e={e} />
                      </span>
                    </div>
                    <div className="podium__step">
                      <span className="podium__rank" aria-label={t('Rank {n}', { n: e.rank })}>
                        {e.rank}
                      </span>
                      <strong className="podium__value">{value_of(board, e)}</strong>
                      <span className="podium__meta">{meta_of(board, e)}</span>
                    </div>
                  </li>
                ))}
              </ol>
              {rest.length || you_apart ? (
                <div className="table-scroll">
                  <table className="table board">
                    <thead>
                      <tr>
                        <th scope="col" className="num">#</th>
                        <th scope="col">{pairs ? t('Players') : t('Player')}</th>
                        <th scope="col" className="num">{t(TITLES[board])}</th>
                        <th scope="col">{t('Details')}</th>
                        <th scope="col">{t('When')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rest.map((e, i) => (
                        <Row key={`${e.rank}-${i}`} board={board} e={e} />
                      ))}
                      {you_apart ? (
                        <>
                          <tr className="board__gap" aria-hidden>
                            <td colSpan={5}>
                              <Icon name="chevron-down" />
                            </td>
                          </tr>
                          <Row board={board} e={you_apart} />
                        </>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState icon="users" title={t('Nobody is on this board yet')}>
              {t('Finish a match in the game’s MULTIPLAYER menu to be the first.')}
            </EmptyState>
          )}
          <p className="muted footnote">
            <Icon name="info" /> {pairs ? tp(data.players, '# pair', '# pairs') : tp(data.players, '# player', '# players')}.{' '}
            {pairs ? t('A coop run counts for both of its players together.') : t('Finished PvP matches count.')}
          </p>
        </div>
      ) : null}
    </Panel>
  );
}

function Row({ board, e }: { board: Board; e: MultiplayerLeaderboardEntry }) {
  return (
    <tr className={e.you ? 'board__you' : undefined}>
      <td className="num">
        <span className={e.rank <= 3 ? `medal medal--${e.rank}` : 'board__rank'}>{e.rank}</span>
      </td>
      <th scope="row">
        <span className="who">
          <Avatars e={e} size="sm" />
          <Who e={e} />
        </span>
      </th>
      <td className="num board__value">{value_of(board, e)}</td>
      <td className="muted">{meta_of(board, e)}</td>
      <td>
        <time dateTime={e.achieved_at} title={fmt_date(e.achieved_at)}>
          {time_ago(e.achieved_at)}
        </time>
      </td>
    </tr>
  );
}

/** Everyone's finished PvP and coop matches together. */
export function MultiplayerEveryone() {
  const { data, error, loading } = use_async(() => game_api.multiplayer_global(), []);
  if (loading && !data) return <Spinner />;
  if (error) return <Alert>{describe(error)}</Alert>;
  if (!data) return null;
  return (
    <section className="stack" aria-labelledby="mp-everyone-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">
            <Icon name="users" /> {t('All players')}
          </p>
          <h2 className="section-title" id="mp-everyone-title">
            {t('Everyone’s matches')}
          </h2>
        </div>
      </div>
      {data.matches ? <Numbers s={data} /> : (
        <Panel>
          <EmptyState icon="users" title={t('No match yet')}>
            {t('PvP and coop matches are in the game’s MULTIPLAYER menu.')}
          </EmptyState>
        </Panel>
      )}
    </section>
  );
}

function Numbers({ s }: { s: MultiplayerGlobalStats }) {
  const { pvp, coop } = s;
  return (
    <>
      <div className="tiles" aria-label={t('Everyone’s matches')}>
        <StatTile icon="users" accent="violet" label={t('Players')} value={<CountUp value={s.players} />} />
        <StatTile icon="swap" accent="blue" label={t('Matches')} value={<CountUp value={s.matches} />}
          hint={t('{p} PvP, {c} coop', { p: fmt_number(pvp.matches), c: fmt_number(coop.matches) })} />
        <StatTile icon="flame" accent="orange" label={t('PvP blinds')} value={<CountUp value={pvp.rounds} />}
          hint={pvp.matches ? t('ante {n} at best, {avg} on average', { n: pvp.best_ante, avg: fmt_number(pvp.average_ante) }) : undefined} />
        <StatTile icon="target" accent="gold" label={t('Best coop ante')} value={<CountUp value={coop.best_ante} />}
          hint={coop.matches ? t('{avg} on average, {n} won', { avg: fmt_number(coop.average_ante), n: fmt_number(coop.runs_won) }) : undefined} />
        <StatTile icon="cards" accent="green" label={t('Best coop hand')} value={format_number(coop.best_hand)}
          hint={coop.best_hand_name ? hand_name(coop.best_hand_name) : undefined} />
      </div>
      <div className="grid-2">
        <Panel title={t('Last 30 days')} icon="calendar">
          <ColumnChart
            unit={t('matches')}
            caption={t('Matches finished per day (UTC)')}
            columns={s.days.map((d) => ({
              key: d.day,
              label: day.format(new Date(`${d.day}T00:00:00Z`)),
              value: d.pvp + d.coop,
              detail: d.pvp + d.coop ? t('{p} PvP, {c} coop', { p: d.pvp, c: d.coop }) : undefined,
            }))}
          />
        </Panel>
        <Panel title={t('Decks played')} icon="layers">
          <BarList
            bars={s.decks.map((d) => ({
              key: d.deck,
              label: (
                <span className="deck-name">
                  <DeckGlyph deck={d.deck} size="sm" />
                  {deck_name(d.deck)}
                </span>
              ),
              value: d.pvp + d.coop,
              text: tp(d.pvp + d.coop, '# match', '# matches'),
              detail: t('{p} PvP, {c} coop', { p: fmt_number(d.pvp), c: fmt_number(d.coop) }),
            }))}
          />
        </Panel>
      </div>
    </>
  );
}
