import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { identity, describe, ProblemError } from '@/shared/api';
import { Alert, Button, Field } from '@/shared/ui';

export function ForgotPasswordForm({ next, email: initial = '' }: { next: string; email?: string }) {
  const [email, setEmail] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await identity.forgot_password(email);
    } catch (err) {
      // a code sent moments ago still works
      if (!(err instanceof ProblemError && err.code === 'too_many_attempts')) {
        setError(describe(err));
        setBusy(false);
        return;
      }
    }
    navigate(`/reset?${new URLSearchParams({ email, next })}`);
  }

  return (
    <form className="form" onSubmit={submit}>
      <p>We'll email you a code to choose a new password. It also works for an account made with Google, to give it a password.</p>
      {error ? <Alert>{error}</Alert> : null}
      <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button type="submit" busy={busy} wide>
        Send the code
      </Button>
    </form>
  );
}
