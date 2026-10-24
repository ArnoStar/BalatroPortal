import { useState } from 'react';
import { identity, describe, type Provider } from '@/shared/api';
import { oauth_redirect_uri } from '@/shared/config';
import { use_async } from '@/shared/lib';
import { Alert, Button, Divider } from '@/shared/ui';
import { remember_oauth_next } from '../model/pending';

const NAMES: Record<Provider, string> = { google: 'Google' };

/** to the provider's sign-in page; back at /auth/callback, then `next` */
async function go_to_provider(provider: Provider, next: string, link: boolean) {
  const start = link ? identity.link : identity.authorize;
  const { authorization_url } = await start(provider, oauth_redirect_uri());
  remember_oauth_next(next);
  window.location.assign(authorization_url);
}

/** "Continue with Google", when the identity service is configured for it */
export function ProviderButtons({ next }: { next: string }) {
  const { data } = use_async(() => identity.providers(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providers = data?.providers ?? [];
  if (!providers.length) return null;

  async function start(provider: Provider) {
    setBusy(true);
    setError(null);
    try {
      await go_to_provider(provider, next, false);
    } catch (err) {
      setError(describe(err));
      setBusy(false);
    }
  }

  return (
    <>
      <Divider>or</Divider>
      {error ? <Alert>{error}</Alert> : null}
      {providers.includes('google') ? (
        <Button type="button" tone="grey" wide busy={busy} onClick={() => start('google')}>
          <GoogleLogo /> Continue with Google
        </Button>
      ) : null}
    </>
  );
}

/** "Link Google" on the account page: links the Google account the player
 * chooses, whatever its email, then back to the account page. Nothing when the
 * provider isn't configured or is linked already. */
export function LinkProviderButtons({ linked }: { linked: Provider[] }) {
  const { data } = use_async(() => identity.providers(), []);
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const available = (data?.providers ?? []).filter((p) => !linked.includes(p));
  if (!available.length) return null;

  async function start(provider: Provider) {
    setBusy(provider);
    setError(null);
    try {
      await go_to_provider(provider, `/account?linked=${provider}`, true);
    } catch (err) {
      setError(describe(err));
      setBusy(null);
    }
  }

  return (
    <>
      {error ? <Alert>{error}</Alert> : null}
      {available.map((provider) => (
        <Button key={provider} type="button" tone="grey" busy={busy === provider} onClick={() => start(provider)}>
          {provider === 'google' ? <GoogleLogo /> : null} Link {NAMES[provider] ?? provider}
        </Button>
      ))}
    </>
  );
}

function GoogleLogo() {
  return (
    <svg className="provider-logo" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
