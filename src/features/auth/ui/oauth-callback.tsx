import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { identity, describe } from '@/shared/api';
import { safe_next } from '@/shared/lib';
import { Alert, Spinner } from '@/shared/ui';
import { take_oauth_next } from '../model/pending';
import { useFinishSignIn } from '../model/use-finish';

/** Where Google sends the browser back (?code=...&state=... or ?error=...). */
export function OAuthCallback({ params }: { params: URLSearchParams }) {
  const [error, setError] = useState<string | null>(null);
  const finish = useFinishSignIn();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // (a code works once; React may run effects twice)
    started.current = true;
    const code = params.get('code');
    const state = params.get('state');
    const next = safe_next(take_oauth_next());
    if (params.get('error') || !code || !state) {
      setError(params.get('error') === 'access_denied' ? 'The sign-in was cancelled.' : 'Google didn\'t sign you in.');
      return;
    }
    identity
      .oauth_callback('google', code, state)
      .then((tokens) => finish(tokens, next))
      .catch((err: unknown) => setError(describe(err)));
  }, [params, finish]);

  if (!error) return <Spinner label="Signing you in" />;
  return (
    <>
      <Alert>{error}</Alert>
      <p>
        <Link to="/login">Back to the sign-in</Link>
      </p>
    </>
  );
}
