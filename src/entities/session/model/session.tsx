// The signed-in player, for every page: their account (GET /auth/me) once the
// stored session is checked. Another tab (or the game) signing in or out is
// picked up through the storage event.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { identity, read_session, save_tokens, write_session, SESSION_KEY, ProblemError, type Account, type Tokens } from '@/shared/api';

export type SessionStatus = 'loading' | 'signed-out' | 'signed-in';

interface SessionValue {
  status: SessionStatus;
  account: Account | null;
  /** the identity service couldn't be reached while checking the session */
  offline: boolean;
  sign_in: (tokens: Tokens) => Promise<Account>;
  sign_out: () => Promise<void>;
  set_account: (account: Account) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [account, setAccount] = useState<Account | null>(null);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    if (!read_session()) {
      setAccount(null);
      setStatus('signed-out');
      return;
    }
    try {
      const me = await identity.me();
      setAccount(me);
      setOffline(false);
      setStatus('signed-in');
    } catch (error) {
      if (error instanceof ProblemError && error.status === 401) write_session(null);
      else setOffline(true);
      setAccount(null);
      setStatus('signed-out');
    }
  }, []);

  useEffect(() => {
    void load();
    const on_storage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY || e.key === null) void load();
    };
    window.addEventListener('storage', on_storage);
    return () => window.removeEventListener('storage', on_storage);
  }, [load]);

  const sign_in = useCallback(async (tokens: Tokens) => {
    const previous = read_session();
    save_tokens(tokens);
    // (signing in again, or linking a provider, makes a new session: end the old one)
    if (previous && previous.refresh_token !== tokens.refresh_token) {
      void identity.logout(previous.refresh_token).catch(() => undefined);
    }
    const me = await identity.me();
    setAccount(me);
    setStatus('signed-in');
    return me;
  }, []);

  const sign_out = useCallback(async () => {
    const s = read_session();
    write_session(null);
    setAccount(null);
    setStatus('signed-out');
    if (s) await identity.logout(s.refresh_token).catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({ status, account, offline, sign_in, sign_out, set_account: setAccount }),
    [status, account, offline, sign_in, sign_out],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession outside SessionProvider');
  return value;
}
