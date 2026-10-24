import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '@/entities/session';
import { identity, describe } from '@/shared/api';
import { Alert, Button } from '@/shared/ui';

export function SignOutButtons() {
  const { sign_out } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'one' | 'all' | null>(null);
  const navigate = useNavigate();

  async function out(all: boolean) {
    setBusy(all ? 'all' : 'one');
    setError(null);
    try {
      if (all) await identity.logout_all();
      await sign_out();
      navigate('/', { replace: true });
    } catch (err) {
      setError(describe(err));
      setBusy(null);
    }
  }

  return (
    <>
      {error ? <Alert>{error}</Alert> : null}
      <div className="row">
        <Button tone="orange" busy={busy === 'one'} onClick={() => out(false)}>
          Log out
        </Button>
        <Button tone="grey" busy={busy === 'all'} onClick={() => out(true)}>
          Log out everywhere
        </Button>
      </div>
      <p className="muted">"Everywhere" ends every session of this account, on every device, within a few minutes.</p>
    </>
  );
}
