import { useState } from 'react';
import { Link } from 'react-router';
import { useSession } from '@/entities/session';
import { identity, describe, type Provider } from '@/shared/api';
import { Alert, Button } from '@/shared/ui';

const NAMES: Record<Provider, string> = { google: 'Google' };

export function SignInMethods() {
  const { account, set_account } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Provider | null>(null);
  if (!account) return null;

  async function unlink(provider: Provider) {
    setBusy(provider);
    setError(null);
    try {
      await identity.unlink(provider);
      set_account(await identity.me());
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {error ? <Alert>{error}</Alert> : null}
      <ul className="methods">
        <li>
          <span>
            <strong>Password</strong> {account.has_password ? 'set' : 'not set'}
          </span>
          <Link className="btn btn--grey" to={`/forgot?${new URLSearchParams({ email: account.email, next: '/account' })}`}>
            {account.has_password ? 'Change' : 'Set a password'}
          </Link>
        </li>
        {account.providers.map((provider) => (
          <li key={provider}>
            <span>
              <strong>{NAMES[provider] ?? provider}</strong> linked
            </span>
            <Button tone="red" busy={busy === provider} onClick={() => unlink(provider)}>
              Unlink
            </Button>
          </li>
        ))}
      </ul>
      {!account.providers.length ? (
        <p className="muted">Signing in with Google with the address {account.email} links it to this account.</p>
      ) : null}
    </>
  );
}
