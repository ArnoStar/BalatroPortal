import { useState, type FormEvent } from 'react';
import { identity, describe } from '@/shared/api';
import { Alert, Button, Field } from '@/shared/ui';
import { t, tx } from '@/shared/i18n';
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
      setError(t('The two passwords are different.'));
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
        {tx('If {email} has an account, we sent it a 6-digit code. Changing the password signs you out everywhere.', { email: <strong>{email}</strong> })}
      </p>
      {error ? <Alert>{error}</Alert> : null}
      <Field
        label={t('Code')}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        className="code-input"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
      />
      <Field label={t('New password')} type="password" autoComplete="new-password" hint={t('At least 8 characters.')} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      <Field label={t('Repeat the password')} type="password" autoComplete="new-password" required value={repeat} onChange={(e) => setRepeat(e.target.value)} />
      <Button type="submit" busy={busy} wide>
        {t('Change the password')}
      </Button>
      <ResendButton initial_wait={60} send={() => identity.forgot_password(email)} onError={setError} />
    </form>
  );
}
