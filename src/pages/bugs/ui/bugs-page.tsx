import { useState } from 'react';
import { Link } from 'react-router';
import { describe, reports_api, ProblemError, type ReportStatus } from '@/shared/api';
import { use_async } from '@/shared/lib';
import { Alert, Panel, Spinner } from '@/shared/ui';

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
      <h1 className="page-title">Bug reports</h1>
      <Panel>
        <div className="filters">
          <div className="segmented" role="group" aria-label="Status">
            {(['open', 'closed', ''] as const).map((s) => (
              <button key={s || 'all'} type="button" className="segmented__item" aria-pressed={s === status} onClick={() => setStatus(s)}>
                {s === 'open' ? 'Open' : s === 'closed' ? 'Closed' : 'All'}
              </button>
            ))}
          </div>
        </div>
        {error ? <Alert>{describe(error)}</Alert> : null}
        {loading && !data ? <Spinner /> : null}
        {data && !data.length ? <p className="muted">No report here.</p> : null}
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
                      <time dateTime={r.created_at}>{when.format(new Date(r.created_at))}</time>
                    </td>
                    <td>{r.reporter_name ?? <span className="muted">{r.reporter.slice(0, 8)}</span>}</td>
                    <th scope="row" className="reports__desc">
                      <Link to={`/bugs/${r.id}`}>{r.description.length > 90 ? `${r.description.slice(0, 90)}…` : r.description}</Link>
                    </th>
                    <td>{r.game_id ? `v${r.game_version}${r.has_history ? '' : ' (no history)'}` : '–'}</td>
                    <td className="num">{r.errors ? <span className="loss">{r.errors}</span> : 0}</td>
                    <td>
                      <span className={`tag${r.status === 'open' ? ' tag--warn' : ''}`}>{r.status}</span>
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
