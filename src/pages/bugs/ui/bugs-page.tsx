import { useState } from 'react';
import { Link } from 'react-router';
import { describe, reports_api, ProblemError, type ReportStatus } from '@/shared/api';
import { time_ago, use_async } from '@/shared/lib';
import { Alert, Avatar, EmptyState, Icon, PageHeader, Panel, Segmented, Spinner } from '@/shared/ui';
import { fmt_datetime, t } from '@/shared/i18n';

const when = { format: (d: Date) => fmt_datetime(d) };

/** The bug reports players sent from the game (developers only). */
export function BugsPage() {
  const [status, setStatus] = useState<ReportStatus | ''>('open');
  const { data, error, loading } = use_async(() => reports_api.list(status || undefined), [status]);
  if (error instanceof ProblemError && error.code === 'not_admin') {
    return <Alert>{t('Bug reports are for the developers (the accounts in ADMINS).')}</Alert>;
  }
  return (
    <div className="stack">
      <PageHeader eyebrow={t('Staff')} icon="bug" title={t('Bug reports')} lead={t('What players sent from the game: their words, the screen, and the game’s recording.')} />
      <Panel
        actions={
          <Segmented
            label={t('Status')}
            value={status}
            onChange={setStatus}
            options={[
              ['open', t('Open')],
              ['closed', t('Closed')],
              ['', t('All')],
            ]}
          />
        }
        title={t('Reports')}
        icon="note"
      >
        {error ? <Alert>{describe(error)}</Alert> : null}
        {loading && !data ? <Spinner /> : null}
        {data && !data.length ? <EmptyState icon="check-circle" title={t('No report here')} /> : null}
        {data?.length ? (
          <div className={`table-scroll${loading ? ' refreshing' : ''}`}>
            <table className="table reports">
              <thead>
                <tr>
                  <th scope="col">{t('When')}</th>
                  <th scope="col">{t('Player')}</th>
                  <th scope="col">{t('What went wrong')}</th>
                  <th scope="col">{t('Run')}</th>
                  <th scope="col" className="num">{t('Errors')}</th>
                  <th scope="col">{t('Status')}</th>
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
                          <Avatar name={r.reporter_name} player={r.reporter} size="sm" />
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
                      {r.has_screenshot ? <Icon name="image" className="reports__has" label={t('with a screenshot')} /> : null}
                    </th>
                    <td>{r.game_id ? `v${r.game_version}${r.has_history ? '' : ` ${t('(no history)')}`}` : '–'}</td>
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
