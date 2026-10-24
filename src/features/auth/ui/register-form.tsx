import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { identity, describe, ProblemError } from '@/shared/api';
import { Alert, Button, Field } from '@/shared/ui';
import { remember_credentials } from '../model/pending';

export function RegisterForm({ next }: { next: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== repeat) {
      setError('The two passwords are different.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await identity.register(email, password, name);
      remember_credentials(email, password);
      navigate(`/confirm?${new URLSearchParams({ email, next })}`);
    } catch (err) {
      if (err instanceof ProblemError && err.code === 'email_not_verified') {
        // registered before without confirming: a new code, same page
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
      <Field
        label="Display name"
        hint="What other players see. 3 to 24 letters, digits, spaces, . _ -"
        autoComplete="nickname"
        required
        minLength={3}
        maxLength={24}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Field label="Repeat the password" type="password" autoComplete="new-password" required value={repeat} onChange={(e) => setRepeat(e.target.value)} />
      <Button type="submit" busy={busy} wide>
        Create the account
      </Button>
      <p className="form__links">
        <Link to={`/login?${new URLSearchParams({ next })}`}>I already have an account</Link>
      </p>
    </form>
  );
}
