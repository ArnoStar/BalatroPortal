import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '@/entities/session';
import { identity, describe } from '@/shared/api';
import { Alert, Button, Field } from '@/shared/ui';

const CONFIRM = 'DELETE';

export function DeleteAccount() {
  const { sign_out } = useSession();
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await identity.delete_me();
      await sign_out();
      navigate('/', { replace: true });
    } catch (err) {
      setError(describe(err));
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <p>
        This deletes the account and its sign-in methods for good. Your runs stay on the game server but nobody can open them
        any more.
      </p>
      {error ? <Alert>{error}</Alert> : null}
      <Field label={`Type ${CONFIRM} to confirm`} autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
      <Button type="submit" tone="red" busy={busy} disabled={typed !== CONFIRM}>
        Delete my account
      </Button>
    </form>
  );
}
