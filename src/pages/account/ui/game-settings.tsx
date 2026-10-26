import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { describe, game_api, type MeView } from '@/shared/api';
import { use_async } from '@/shared/lib';
import { Alert, Spinner } from '@/shared/ui';

/** The game's side of the account: profile privacy, and "unlock everything" for testers. */
export function GameSettings() {
  const { data, error, loading } = use_async(() => game_api.me(), []);
  const [me, setMe] = useState<MeView | null>(null);
  const [busy, setBusy] = useState(false);
  const [save_error, setSaveError] = useState<string | null>(null);
  useEffect(() => { if (data) setMe(data); }, [data]);

  async function change(changes: { private?: boolean; all_unlocked?: boolean }) {
    setBusy(true);
    setSaveError(null);
    try {
      setMe(await game_api.update_me(changes));
    } catch (err) {
      setSaveError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !me) return <Spinner />;
  if (error) return <Alert>{describe(error)}</Alert>;
  if (!me) return null;
  const p = me.progress;
  return (
    <div className="stack">
      {save_error ? <Alert>{save_error}</Alert> : null}
      <label className="check">
        <input type="checkbox" checked={me.private} disabled={busy} onChange={(e) => change({ private: e.target.checked })} />
        <span>
          Private profile
          <span className="muted"> · others see only your name, and can't watch your runs</span>
        </span>
      </label>
      {p.can_unlock_all ? (
        <label className="check">
          <input type="checkbox" checked={p.all_unlocked} disabled={busy} onChange={(e) => change({ all_unlocked: e.target.checked })} />
          <span>
            Unlock everything (for tests)
            <span className="muted">
              {' '}· your new runs start with every deck, stake, challenge and card open. They add nothing to your
              progress, which stays as it is: switch this off to get it back.
            </span>
          </span>
        </label>
      ) : null}
      <p className="muted">
        {p.all_unlocked
          ? 'Everything is unlocked for your new runs.'
          : `Progress: ${p.unlocked.length} cards and decks unlocked beyond a new save, ${p.challenges_unlocked} challenges open.`}{' '}
        <Link to="/players/me">See your profile</Link>.
      </p>
    </div>
  );
}
