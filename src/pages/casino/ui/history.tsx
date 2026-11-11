import { useState } from 'react';
import { Link } from 'react-router';
import { describe, items_api, type ItemsMe } from '@/shared/api';
import { time_ago, use_async } from '@/shared/lib';
import { Alert, Avatar, EmptyState, Icon, Panel, Segmented, Spinner } from '@/shared/ui';
import { MODE_NAMES, value_label } from '../lib/text';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function History({ me }: { me: ItemsMe }) {
  const [whose, setWhose] = useState<'mine' | 'all'>('mine');
  const games = use_async(() => items_api.casino_games(whose === 'mine' ? me.id : undefined, 50), [whose, me.id]);
  return (
    <Panel
      title="Games played"
      icon="history"
      actions={
        <Segmented
          label="Whose games"
          value={whose}
          onChange={setWhose}
          options={[
            ['mine', 'Yours'],
            ['all', "Everyone's"],
          ]}
        />
      }
    >
      {games.loading && !games.data ? <Spinner /> : null}
      {games.error ? <Alert>{describe(games.error)}</Alert> : null}
      {games.data?.length === 0 ? <EmptyState icon="dice" title="No game yet" /> : null}
      {games.data?.length ? (
        <div className={`table-scroll${games.loading ? ' refreshing' : ''}`}>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Game</th>
                <th scope="col" className="num">Players</th>
                <th scope="col" className="num">Pot</th>
                <th scope="col">Winner</th>
                <th scope="col">
                  <span className="visually-hidden">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {games.data.map((g) => {
                const won = g.winner === me.id;
                const was_in = g.entries.some((e) => e.player === me.id);
                return (
                  <tr key={g.id}>
                    <td>
                      <time dateTime={g.updated_at} title={when(g.updated_at)}>
                        {time_ago(g.updated_at)}
                      </time>
                    </td>
                    <td>
                      <span className="game-mode">
                        <Icon name={g.mode === 'jackpot' ? 'coins' : 'dice'} />
                        {MODE_NAMES[g.mode]}
                      </span>
                    </td>
                    <td className="num">{new Set(g.entries.map((e) => e.player)).size}</td>
                    <td className="num">{value_label(g.value)}</td>
                    <td>
                      <span className={`who ${won ? 'win' : was_in ? 'loss' : ''}`}>
                        <Avatar name={won ? 'You' : g.winner_name} seed={g.winner_name} size="sm" />
                        {won ? 'You' : g.winner_name ?? 'A player'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/casino/${g.id}`} viewTransition>
                        Details
                      </Link>
                    </td>
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
