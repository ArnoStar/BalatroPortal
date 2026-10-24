import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { identity, describe, ProblemError } from '@/shared/api';
import { Alert, Button, Field } from '@/shared/ui';
import { take_credentials } from '../model/pending';
import { useFinishSignIn } from '../model/use-finish';
import { ResendButton } from './resend';

export function ConfirmEmailForm({ email, next, resend }: { email: string; next: string; resend: boolean }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(resend ? 0 : 60);
  const password = useRef<string | null>(take_credentials(email));
  const finish = useFinishSignIn();
  const navigate = useNavigate();
  const sent_on_open = useRef(false);

  useEffect(() => {
    // came from a login refused for an unverified email: send a code at once
    if (!resend || sent_on_open.current) return;
    sent_on_open.current = true;
    identity.resend_confirmation(email).then(
      () => { setInfo(`We sent a new code to ${email}.`); setWait(60); },
      (err: unknown) => {
        if (err instanceof ProblemError && err.problem.retry_after) setWait(err.problem.retry_after);
        else setError(describe(err));
      },
    );
  }, [email, resend]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await identity.confirm_email(email, code);
      if (password.current) {
        await finish(await identity.login(email, password.current), next);
      } else {
        navigate(`/login?${new URLSearchParams({ email, next, confirmed: '1' })}`, { replace: true });
      }
    } catch (err) {
      setError(describe(err));
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      {info ? <Alert tone="info">{info}</Alert> : <p>We sent a 6-digit code to <strong>{email}</strong>. It works for 10 minutes.</p>}
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
      <Button type="submit" busy={busy} wide>
        Confirm
      </Button>
      <ResendButton key={wait} initial_wait={wait} send={() => identity.resend_confirmation(email)} onError={setError} />
    </form>
  );
}
