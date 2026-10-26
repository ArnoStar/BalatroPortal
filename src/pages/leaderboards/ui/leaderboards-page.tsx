import { Link } from 'react-router';
import { useState } from 'react';
import { Everyone } from './everyone';
import { DECK_KEYS, STAKES, deck_name, stake_name } from '@/entities/catalog';
import { BOARDS, describe, game_api, type BoardName, type LeaderboardEntry } from '@/shared/api';
import { format_number, use_async } from '@/shared/lib';
import { Alert, Panel, Spinner } from '@/shared/ui';

const TITLES: Record<BoardName, string> = {
  best_hand: 'Best hand', highest_ante: 'Highest ante', highest_round: 'Highest round', most_money: 'Most money',
  boss_streak: 'Bosses in a row', wins: 'Wins',
};
const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

export function LeaderboardsPage() {
  const [board, setBoard] = useState<BoardName>('best_hand');
  const [deck, setDeck] = useState('');
  const [stake, setStake] = useState(0);
  const { data, error, loading } = use_async(
    () => game_api.leaderboard(board, { deck: deck || undefined, stake: stake || undefined }),
    [board, deck, stake],
  );

  return (
    <div className="stack">
      <h1 className="page-title">Leaderboards</h1>
      <Panel>
        <div className="filters">
          <div className="segmented" role="group" aria-label="Leaderboard">
            {BOARDS.map((b) => (
              <button key={b} type="button" className="segmented__item" aria-pressed={b === board} onClick={() => setBoard(b)}>
                {TITLES[b]}
              </button>
            ))}
          </div>
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
        {error ? <Alert>{describe(error)}</Alert> : null}
        {loading && !data ? <Spinner /> : null}
        {data ? (
          <div className={loading ? 'refreshing' : undefined}>
            {data.entries.length ? (
              <Board board={board} entries={data.entries} you={data.you} />
            ) : (
              <p className="muted">Nobody is on this board yet.</p>
            )}
            <p className="muted">
              {data.players} {data.players === 1 ? 'player' : 'players'}.{' '}
              {board === 'wins' ? "Each player's won runs are counted" : "Each player's best run is shown"}; runs with a
              chosen seed, challenges and runs with debug commands don't count.
            </p>
          </div>
        ) : null}
      </Panel>
      <Everyone />
    </div>
  );
}

function Board({ board, entries, you }: { board: BoardName; entries: LeaderboardEntry[]; you: LeaderboardEntry | null }) {
  const shown = entries.some((e) => e.you);
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
          {entries.map((e, i) => (
            <Row key={i} board={board} e={e} />
          ))}
          {you && !shown ? (
            <>
              <tr className="board__gap" aria-hidden>
                <td colSpan={6}>…</td>
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
  const value = board === 'most_money' ? `$${format_number(e.value)}` : format_number(e.value);
  return (
    <tr className={e.you ? 'board__you' : undefined}>
      <td className="num">
        <span className={e.rank <= 3 ? `medal medal--${e.rank}` : undefined}>{e.rank}</span>
      </td>
      <th scope="row">
        {e.player_id ? <Link to={`/players/${encodeURIComponent(e.player_id)}`}>{e.player ?? 'Anonymous'}</Link> : (e.player ?? <span className="muted">Anonymous</span>)}
        {e.you ? <span className="tag">You</span> : null}
      </th>
      <td className="num board__value">{value}</td>
      {board === 'wins' ? null : (
        <>
          <td>
            {e.deck ? deck_name(e.deck) : '–'}
            {e.won ? <span className="tag tag--win">Won</span> : null}
          </td>
          <td>{e.stake ? <span className={`stake stake--${e.stake}`}>{stake_name(e.stake)}</span> : '–'}</td>
        </>
      )}
      <td>
        <time dateTime={e.achieved_at}>{when.format(new Date(e.achieved_at))}</time>
      </td>
    </tr>
  );
}
