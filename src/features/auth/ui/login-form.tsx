import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { identity, describe, ProblemError } from '@/shared/api';
import { Alert, Button, Field } from '@/shared/ui';
import { remember_credentials } from '../model/pending';
import { useFinishSignIn } from '../model/use-finish';

export function LoginForm({ next, email: initial = '' }: { next: string; email?: string }) {
  const [email, setEmail] = useState(initial);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const finish = useFinishSignIn();
  const navigate = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await finish(await identity.login(email, password), next);
    } catch (err) {
      if (err instanceof ProblemError && err.code === 'email_not_verified') {
        remember_credentials(email, password);
        navigate(`/confirm?${new URLSearchParams({ email, next, resend: '1' })}`);
        return;
      }
      setError(describe(err));
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      {error ? <Alert>{error}</Alert> : null}
      <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button type="submit" busy={busy} wide>
        Sign in
      </Button>
      <p className="form__links">
        <Link to={`/forgot?${new URLSearchParams({ email, next })}`}>Forgot your password?</Link>
        <Link to={`/register?${new URLSearchParams({ next })}`}>Create an account</Link>
      </p>
    </form>
  );
}
