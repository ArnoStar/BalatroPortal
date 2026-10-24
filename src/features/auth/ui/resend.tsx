import { useEffect, useState } from 'react';
import { describe, ProblemError } from '@/shared/api';
import { Button } from '@/shared/ui';

/** "Send a new code", with the minute the service makes the player wait */
export function ResendButton({ send, initial_wait = 0, onError }: { send: () => Promise<void>; initial_wait?: number; onError: (message: string | null) => void }) {
  const [wait, setWait] = useState(initial_wait);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function click() {
    setBusy(true);
    onError(null);
    try {
      await send();
      setSent(true);
      setWait(60);
    } catch (err) {
      if (err instanceof ProblemError && err.problem.retry_after) setWait(err.problem.retry_after);
      else onError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" tone="grey" busy={busy} disabled={wait > 0} onClick={click}>
      {wait > 0 ? `New code in ${wait} s` : sent ? 'Send another code' : 'Send a new code'}
    </Button>
  );
}
