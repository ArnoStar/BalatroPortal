import { useEffect, useState, type FormEvent } from 'react';
import { describe, identity, ProblemError, type AccountSummary, type Role } from '@/shared/api';
import { use_async } from '@/shared/lib';
import { Alert, Button, Panel, Spinner } from '@/shared/ui';

const ROLES: Role[] = ['admin', 'developer', 'tester'];
const PAGE = 50;
const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'short' });

/** Accounts and their roles (admins only: the identity service refuses everyone else). */
export function AdminPage() {
  const roles = use_async(() => identity.roles(), []);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<{ query: string; role: Role | '' }>({ query: '', role: '' });
  const [pages, setPages] = useState(1);
  const { data, error, loading } = use_async(
    () => identity.accounts({ query: filter.query || undefined, role: filter.role || undefined, limit: PAGE * pages }),
    [filter, pages],
  );
  const [rows, setRows] = useState<AccountSummary[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => setRows(data?.accounts ?? []), [data]);

  if (error instanceof ProblemError && error.code === 'forbidden') {
    return <Alert>Accounts and roles are for the admins.</Alert>;
  }

  function search(e: FormEvent) {
    e.preventDefault();
    setPages(1);
    setFilter({ ...filter, query: query.trim() });
  }

  async function toggle(account: AccountSummary, role: Role) {
    const next = account.roles.includes(role) ? account.roles.filter((r) => r !== role) : [...account.roles, role];
    setBusy(`${account.id}:${role}`);
    setProblem(null);
    try {
      const updated = await identity.set_roles(account.id, next);
      setRows((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setProblem(describe(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      <h1 className="page-title">Accounts and roles</h1>
      <Panel>
        {roles.data ? (
          <dl className="roles-legend">
            {roles.data.map((r) => (
              <div key={r.role}>
                <dt>
                  <span className={`role role--${r.role}`}>{r.role}</span>
                </dt>
                <dd>{r.description}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <p className="muted">
          A change is in the account's access tokens from their next refresh (within 15 minutes). The last admin keeps the admin role.
        </p>
      </Panel>
      <Panel>
        <form className="filters" onSubmit={search} role="search">
          <div className="field admin__search">
            <label htmlFor="admin-query">Email or name</label>
            <input id="admin-query" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={320} />
          </div>
          <label className="select">
            <span>Role</span>
            <select value={filter.role} onChange={(e) => { setPages(1); setFilter({ ...filter, role: e.target.value as Role | '' }); }}>
              <option value="">Any</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <Button type="submit" tone="blue">Search</Button>
        </form>
        {problem ? <Alert>{problem}</Alert> : null}
        {error && !(error instanceof ProblemError && error.code === 'forbidden') ? <Alert>{describe(error)}</Alert> : null}
        {loading && !data ? <Spinner /> : null}
        {data ? (
          <>
            <p className="muted">{data.total} {data.total === 1 ? 'account' : 'accounts'}</p>
            <div className={`table-scroll${loading ? ' refreshing' : ''}`}>
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    {ROLES.map((r) => (
                      <th key={r} scope="col" className="admin__role">{r}</th>
                    ))}
                    <th scope="col">Since</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id}>
                      <th scope="row">{a.display_name}</th>
                      <td className="admin__email">
                        {a.email}
                        {a.email_verified ? null : <span className="tag tag--muted">unconfirmed</span>}
                      </td>
                      {ROLES.map((r) => (
                        <td key={r} className="admin__role">
                          <input
                            type="checkbox"
                            className="admin__check"
                            checked={a.roles.includes(r)}
                            disabled={busy !== null}
                            aria-busy={busy === `${a.id}:${r}` || undefined}
                            aria-label={`${r} role for ${a.display_name}`}
                            onChange={() => toggle(a, r)}
                          />
                        </td>
                      ))}
                      <td>
                        <time dateTime={a.created_at}>{when.format(new Date(a.created_at))}</time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.total > rows.length ? (
              <p>
                <Button tone="grey" onClick={() => setPages(pages + 1)}>Show more</Button>
              </p>
            ) : null}
          </>
        ) : null}
      </Panel>
    </div>
  );
}
