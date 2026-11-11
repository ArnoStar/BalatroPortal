import { useState } from 'react';
import { Link } from 'react-router';
import { describe, reports_api, ProblemError, type ReportStatus } from '@/shared/api';
import { time_ago, use_async } from '@/shared/lib';
import { Alert, Avatar, EmptyState, Icon, PageHeader, Panel, Segmented, Spinner } from '@/shared/ui';

const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** The bug reports players sent from the game (developers only). */
export function BugsPage() {
  const [status, setStatus] = useState<ReportStatus | ''>('open');
  const { data, error, loading } = use_async(() => reports_api.list(status || undefined), [status]);
  if (error instanceof ProblemError && error.code === 'not_admin') {
    return <Alert>Bug reports are for the developers (the accounts in ADMINS).</Alert>;
  }
  return (
    <div className="stack">
      <PageHeader eyebrow="Staff" icon="bug" title="Bug reports" lead="What players sent from the game: their words, the screen, and the game's recording." />
      <Panel
        actions={
          <Segmented
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              ['open', 'Open'],
              ['closed', 'Closed'],
              ['', 'All'],
            ]}
          />
        }
        title="Reports"
        icon="note"
      >
        {error ? <Alert>{describe(error)}</Alert> : null}
        {loading && !data ? <Spinner /> : null}
        {data && !data.length ? <EmptyState icon="check-circle" title="No report here" /> : null}
        {data?.length ? (
          <div className={`table-scroll${loading ? ' refreshing' : ''}`}>
            <table className="table reports">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Player</th>
                  <th scope="col">What went wrong</th>
                  <th scope="col">Run</th>
                  <th scope="col" className="num">Errors</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <time dateTime={r.created_at} title={when.format(new Date(r.created_at))}>
                        {time_ago(r.created_at)}
                      </time>
                    </td>
                    <td>
                      {r.reporter_name ? (
                        <span className="who">
                          <Avatar name={r.reporter_name} size="sm" />
                          {r.reporter_name}
                        </span>
                      ) : (
                        <span className="muted mono">{r.reporter.slice(0, 8)}</span>
                      )}
                    </td>
                    <th scope="row" className="reports__desc">
                      <Link to={`/bugs/${r.id}`} viewTransition>
                        {r.description.length > 90 ? `${r.description.slice(0, 90)}…` : r.description}
                      </Link>
                      {r.has_screenshot ? <Icon name="image" className="reports__has" label="with a screenshot" /> : null}
                    </th>
                    <td>{r.game_id ? `v${r.game_version}${r.has_history ? '' : ' (no history)'}` : '–'}</td>
                    <td className="num">{r.errors ? <span className="error-count">{r.errors}</span> : <span className="muted">0</span>}</td>
                    <td>
                      <span className={`status status--${r.status === 'open' ? 'lost' : 'won'}`}>
                        <Icon name={r.status === 'open' ? 'dot' : 'check-circle'} />
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
