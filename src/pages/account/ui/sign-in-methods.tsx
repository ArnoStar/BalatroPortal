import { useState } from 'react';
import { Link } from 'react-router';
import { LinkProviderButtons } from '@/features/auth';
import { useSession } from '@/entities/session';
import { identity, describe, type Provider } from '@/shared/api';
import { Alert, Button, Icon } from '@/shared/ui';

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
          <span className="methods__icon">
            <Icon name="key" />
          </span>
          <span className="methods__text">
            <strong>Password</strong>
            <small>{account.has_password ? 'Set' : 'Not set'}</small>
          </span>
          <Link className="btn btn--grey btn--sm" to={`/forgot?${new URLSearchParams({ email: account.email, next: '/account' })}`} viewTransition>
            {account.has_password ? 'Change' : 'Set a password'}
          </Link>
        </li>
        {account.providers.map((provider) => (
          <li key={provider}>
            <span className="methods__icon">
              <Icon name="external" />
            </span>
            <span className="methods__text">
              <strong>{NAMES[provider] ?? provider}</strong>
              <small>Linked</small>
            </span>
            <Button tone="red" size="sm" busy={busy === provider} onClick={() => unlink(provider)} icon={<Icon name="close" />}>
              Unlink
            </Button>
          </li>
        ))}
      </ul>
      <div className="row">
        <LinkProviderButtons linked={account.providers} />
      </div>
    </>
  );
}
