import { useState, type FormEvent } from 'react';
import { useSession } from '@/entities/session';
import { identity, describe, refresh_session, read_session } from '@/shared/api';
import { Alert, Button, Field } from '@/shared/ui';

export function DisplayNameForm() {
  const { account, set_account } = useSession();
  const [name, setName] = useState(account?.display_name ?? '');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const updated = await identity.update_me({ display_name: name });
      set_account(updated);
      setName(updated.display_name);
      // the access token carries the name (the game shows it): get one with the new name
      const s = read_session();
      if (s) await refresh_session(s.access_token);
      setMessage({ tone: 'success', text: 'Saved.' });
    } catch (err) {
      setMessage({ tone: 'error', text: describe(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form form--inline" onSubmit={submit}>
      <Field label="Display name" hint="What other players see." required minLength={3} maxLength={24} value={name} onChange={(e) => setName(e.target.value)} />
      <Button type="submit" busy={busy} disabled={name.trim() === account?.display_name}>
        Save
      </Button>
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
    </form>
  );
}
