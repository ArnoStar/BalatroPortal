import { useState } from 'react';
import { Link } from 'react-router';
import { describe, items_api, type ItemsMe } from '@/shared/api';
import { use_async } from '@/shared/lib';
import { Alert, Panel, Spinner } from '@/shared/ui';
import { MODE_NAMES, value_label } from '../lib/text';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function History({ me }: { me: ItemsMe }) {
  const [whose, setWhose] = useState<'mine' | 'all'>('mine');
  const games = use_async(() => items_api.casino_games(whose === 'mine' ? me.id : undefined, 50), [whose, me.id]);
  return (
    <Panel title="Games played">
      <div className="segmented" role="group" aria-label="Whose games">
        {([['mine', 'Yours'], ['all', 'Everyone\'s']] as const).map(([w, label]) => (
          <button key={w} type="button" className="segmented__item" aria-pressed={whose === w} onClick={() => setWhose(w)}>
            {label}
          </button>
        ))}
      </div>
      {games.loading && !games.data ? <Spinner /> : null}
      {games.error ? <Alert>{describe(games.error)}</Alert> : null}
      {games.data?.length === 0 ? <p className="muted">No game yet.</p> : null}
      {games.data?.length ? (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Game</th>
                <th scope="col">Players</th>
                <th scope="col" className="num">Pot</th>
                <th scope="col">Winner</th>
                <th scope="col"><span className="visually-hidden">Details</span></th>
              </tr>
            </thead>
            <tbody>
              {games.data.map((g) => {
                const won = g.winner === me.id;
                const was_in = g.entries.some((e) => e.player === me.id);
                return (
                  <tr key={g.id}>
                    <td>{when(g.updated_at)}</td>
                    <td>{MODE_NAMES[g.mode]}</td>
                    <td>{new Set(g.entries.map((e) => e.player)).size}</td>
                    <td className="num">{value_label(g.value)}</td>
                    <td className={won ? 'win' : was_in ? 'loss' : undefined}>{won ? 'You' : g.winner_name ?? 'A player'}</td>
                    <td><Link to={`/casino/${g.id}`}>Details</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}
