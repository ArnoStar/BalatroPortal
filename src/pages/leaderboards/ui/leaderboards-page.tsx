import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { Everyone } from './everyone';
import { DECK_KEYS, DeckGlyph, STAKES, deck_name, stake_name } from '@/entities/catalog';
import { BOARDS, describe, game_api, type BoardName, type LeaderboardEntry } from '@/shared/api';
import { format_number, time_ago, use_async } from '@/shared/lib';
import { Alert, Avatar, EmptyState, Icon, PageHeader, Panel, Segmented, Spinner, type IconName } from '@/shared/ui';

const TITLES: Record<BoardName, string> = {
  best_hand: 'Best hand', highest_ante: 'Highest ante', highest_round: 'Highest round', most_money: 'Most money',
  boss_streak: 'Bosses in a row', wins: 'Wins',
};
const ICONS: Record<BoardName, IconName> = {
  best_hand: 'zap', highest_ante: 'target', highest_round: 'layers', most_money: 'coins', boss_streak: 'flame', wins: 'trophy',
};
const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

const value_of = (board: BoardName, e: LeaderboardEntry) => (board === 'most_money' ? `$${format_number(e.value)}` : format_number(e.value));

export function LeaderboardsPage() {
  const [board, setBoard] = useState<BoardName>('best_hand');
  const [deck, setDeck] = useState('');
  const [stake, setStake] = useState(0);
  const { data, error, loading } = use_async(
    () => game_api.leaderboard(board, { deck: deck || undefined, stake: stake || undefined }),
    [board, deck, stake],
  );
  const podium = data?.entries.slice(0, 3) ?? [];
  const rest = data?.entries.slice(3) ?? [];

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Compete"
        icon="trophy"
        title="Leaderboards"
        lead={board === 'wins' ? "Each player's won runs, counted." : "Each player's best run on every board."}
      />
      <Panel>
        <div className="filters">
          <Segmented
            label="Leaderboard"
            value={board}
            onChange={setBoard}
            options={BOARDS.map((b) => [b, <><Icon name={ICONS[b]} /> {TITLES[b]}</>] as const)}
          />
          <div className="filters__selects">
            <label className="select">
              <span>Deck</span>
              <select value={deck} onChange={(e) => setDeck(e.target.value)}>
                <option value="">All decks</option>
                {DECK_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {deck_name(k)}
                  </option>
                ))}
              </select>
            </label>
            <label className="select">
              <span>Stake</span>
              <select value={stake} onChange={(e) => setStake(Number(e.target.value))}>
                <option value={0}>All stakes</option>
                {STAKES.map((s, i) => (
                  <option key={s} value={i + 1}>
                    {stake_name(i + 1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {error ? <Alert>{describe(error)}</Alert> : null}
        {loading && !data ? <Spinner /> : null}
        {data ? (
          <div className={loading ? 'refreshing' : undefined}>
            {data.entries.length ? (
              <>
                <Podium board={board} top={podium} />
                {rest.length || (data.you && !data.entries.some((e) => e.you)) ? (
                  <Board board={board} entries={rest} you={data.entries.some((e) => e.you) ? null : data.you} />
                ) : null}
              </>
            ) : (
              <EmptyState icon="trophy" title="Nobody is on this board yet">
                Win a run with this deck and stake to be the first.
              </EmptyState>
            )}
            <p className="muted footnote">
              <Icon name="info" /> {data.players.toLocaleString('en-US')} {data.players === 1 ? 'player' : 'players'}.{' '}
              {board === 'wins' ? "Each player's won runs are counted" : "Each player's best run is shown"}; runs with a chosen seed, challenges and
              runs with debug commands don't count.
            </p>
          </div>
        ) : null}
      </Panel>
      <Everyone />
    </div>
  );
}

function Who({ e }: { e: LeaderboardEntry }) {
  const name = e.player ?? 'Anonymous';
  return e.player_id ? (
    <Link to={`/players/${encodeURIComponent(e.player_id)}`} viewTransition>
      {name}
    </Link>
  ) : (
    <span className={e.player ? undefined : 'muted'}>{name}</span>
  );
}

/** the first three, on their steps (second, first, third) */
function Podium({ board, top }: { board: BoardName; top: LeaderboardEntry[] }) {
  return (
    <ol className="podium" aria-label="The first three">
      {top.map((e, i) => (
        <li key={e.rank} className={`podium__place podium__place--${e.rank}${e.you ? ' is-you' : ''}`} style={{ '--i': i } as CSSProperties}>
          <div className="podium__who">
            {e.rank === 1 ? <Icon name="crown" className="podium__crown" /> : null}
            <Avatar name={e.player} size="lg" />
            <span className="podium__name">
              <Who e={e} />
              {e.you ? <span className="tag tag--you">You</span> : null}
            </span>
          </div>
          <div className="podium__step">
            <span className="podium__rank" aria-label={`Rank ${e.rank}`}>
              {e.rank}
            </span>
            <strong className="podium__value">{value_of(board, e)}</strong>
            {board === 'wins' ? (
              <span className="podium__meta">last win {time_ago(e.achieved_at)}</span>
            ) : (
              <span className="podium__meta">
                {e.deck ? (
                  <span className="deck-name">
                    <DeckGlyph deck={e.deck} size="sm" />
                    {deck_name(e.deck)}
                  </span>
                ) : null}
                {e.stake ? <span className={`stake stake--${e.stake}`}>{stake_name(e.stake)}</span> : null}
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Board({ board, entries, you }: { board: BoardName; entries: LeaderboardEntry[]; you: LeaderboardEntry | null }) {
  return (
    <div className="table-scroll">
      <table className="table board">
        <thead>
          <tr>
            <th scope="col" className="num">#</th>
            <th scope="col">Player</th>
            <th scope="col" className="num">{TITLES[board]}</th>
            {board === 'wins' ? null : (
              <>
                <th scope="col">Deck</th>
                <th scope="col">Stake</th>
              </>
            )}
            <th scope="col">{board === 'wins' ? 'Last win' : 'When'}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <Row key={e.rank} board={board} e={e} />
          ))}
          {you ? (
            <>
              <tr className="board__gap" aria-hidden>
                <td colSpan={6}>
                  <Icon name="chevron-down" />
                </td>
              </tr>
              <Row board={board} e={you} />
            </>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function Row({ board, e }: { board: BoardName; e: LeaderboardEntry }) {
  return (
    <tr className={e.you ? 'board__you' : undefined}>
      <td className="num">
        <span className={e.rank <= 3 ? `medal medal--${e.rank}` : 'board__rank'}>{e.rank}</span>
      </td>
      <th scope="row">
        <span className="who">
          <Avatar name={e.player} size="sm" />
          <Who e={e} />
          {e.you ? <span className="tag tag--you">You</span> : null}
        </span>
      </th>
      <td className="num board__value">{value_of(board, e)}</td>
      {board === 'wins' ? null : (
        <>
          <td>
            {e.deck ? (
              <span className="deck-name">
                <DeckGlyph deck={e.deck} size="sm" />
                {deck_name(e.deck)}
              </span>
            ) : (
              '–'
            )}
            {e.won ? (
              <span className="tag tag--win">
                <Icon name="check" />
                Won
              </span>
            ) : null}
          </td>
          <td>{e.stake ? <span className={`stake stake--${e.stake}`}>{stake_name(e.stake)}</span> : '–'}</td>
        </>
      )}
      <td>
        <time dateTime={e.achieved_at} title={when.format(new Date(e.achieved_at))}>
          {time_ago(e.achieved_at)}
        </time>
      </td>
    </tr>
  );
}
