import { useState, type FormEvent } from 'react';
import { identity, describe } from '@/shared/api';
import { Alert, Button, Field } from '@/shared/ui';
import { useFinishSignIn } from '../model/use-finish';
import { ResendButton } from './resend';

export function ResetPasswordForm({ email, next }: { email: string; next: string }) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const finish = useFinishSignIn();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== repeat) {
      setError('The two passwords are different.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await identity.reset_password(email, code, password);
      await finish(await identity.login(email, password), next);
    } catch (err) {
      setError(describe(err));
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <p>
        If <strong>{email}</strong> has an account, we sent it a 6-digit code. Changing the password signs you out everywhere.
      </p>
      {error ? <Alert>{error}</Alert> : null}
      <Field
        label="Code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        className="code-input"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
      />
      <Field label="New password" type="password" autoComplete="new-password" hint="At least 8 characters." required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      <Field label="Repeat the password" type="password" autoComplete="new-password" required value={repeat} onChange={(e) => setRepeat(e.target.value)} />
      <Button type="submit" busy={busy} wide>
        Change the password
      </Button>
      <ResendButton initial_wait={60} send={() => identity.forgot_password(email)} onError={setError} />
    </form>
  );
}
