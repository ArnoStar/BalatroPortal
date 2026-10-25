// The identity service (BalatroIndentityService): accounts and sign-in.
import { IDENTITY_BASE } from '@/shared/config';
import { read_json } from './problem';
import { authorized_fetch, type Tokens } from './session';

export type Provider = 'google';

/** what an account may do beyond playing (each service decides what a role allows there) */
export type Role = 'admin' | 'developer' | 'tester';

export interface Account {
  id: string;
  email: string;
  display_name: string;
  email_verified: boolean;
  has_password: boolean;
  providers: Provider[];
  created_at: string;
  roles?: Role[];
}

/** an account as the admins see it */
export interface AccountSummary {
  id: string;
  email: string;
  display_name: string;
  email_verified: boolean;
  roles: Role[];
  created_at: string;
}

function post<T>(path: string, body: unknown): Promise<T> {
  return fetch(`${IDENTITY_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).then((res) => read_json<T>(res));
}

function authorized<T>(method: string, path: string, body?: unknown): Promise<T> {
  return authorized_fetch(`${IDENTITY_BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).then((res) => read_json<T>(res));
}

export const identity = {
  register: (email: string, password: string, display_name: string) =>
    post<{ user_id: string }>('/auth/register', { email, password, display_name }),
  confirm_email: (email: string, code: string) => post<void>('/auth/confirm-email', { email, code }),
  resend_confirmation: (email: string) => post<void>('/auth/resend-confirmation', { email }),
  login: (email: string, password: string) => post<Tokens>('/auth/login', { email, password }),
  logout: (refresh_token: string) => post<void>('/auth/logout', { refresh_token }),
  logout_all: () => authorized<void>('POST', '/auth/logout-all'),
  forgot_password: (email: string) => post<void>('/auth/password/forgot', { email }),
  reset_password: (email: string, code: string, password: string) =>
    post<void>('/auth/password/reset', { email, code, password }),
  me: () => authorized<Account>('GET', '/auth/me'),
  update_me: (changes: { display_name?: string }) => authorized<Account>('PATCH', '/auth/me', changes),
  delete_me: () => authorized<void>('DELETE', '/auth/me'),
  providers: () => fetch(`${IDENTITY_BASE}/oauth/providers`).then((res) => read_json<{ providers: Provider[] }>(res)),
  authorize: (provider: Provider, redirect_uri: string) =>
    post<{ authorization_url: string; state: string }>(`/oauth/${provider}/authorize`, { redirect_uri }),
  /** as `authorize`, but the provider's account is linked to the signed-in account */
  link: (provider: Provider, redirect_uri: string) =>
    authorized<{ authorization_url: string; state: string }>('POST', `/oauth/${provider}/link`, { redirect_uri }),
  oauth_callback: (provider: Provider, code: string, state: string) =>
    post<Tokens>(`/oauth/${provider}/callback`, { code, state }),
  unlink: (provider: Provider) => authorized<void>('DELETE', `/oauth/${provider}`),
  roles: () => fetch(`${IDENTITY_BASE}/roles`).then((res) => read_json<{ role: Role; description: string }[]>(res)),
  /** admins: accounts whose email or name contains `query` */
  accounts: (filters: { query?: string; role?: Role; offset?: number; limit?: number } = {}) => {
    const q = new URLSearchParams({ limit: String(filters.limit ?? 50), offset: String(filters.offset ?? 0) });
    if (filters.query) q.set('query', filters.query);
    if (filters.role) q.set('role', filters.role);
    return authorized<{ accounts: AccountSummary[]; total: number }>('GET', `/admin/accounts?${q}`);
  },
  set_roles: (id: string, roles: Role[]) => authorized<AccountSummary>('PUT', `/admin/accounts/${id}/roles`, { roles }),
};
