// Sharing one of the player's runs with a friend or a group (the social
// service reads it from the game API as it is now: a card in the chat, with
// its seed, to watch it again or play the same seed).
import { useState } from 'react';
import { Link } from 'react-router';
import { PresenceDot, conversation_title, useSocial } from '@/entities/social';
import { avatar_url, describe, social_api, type RunSummary } from '@/shared/api';
import { Alert, Avatar, Icon, Modal } from '@/shared/ui';

type Target = { kind: 'friend'; id: string } | { kind: 'conversation'; id: string };

export function ShareRunModal({ run, onClose }: { run: RunSummary; onClose: () => void }) {
  const social = useSocial();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState<{ conversation: string; to: string } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const groups = social.conversations.filter((c) => c.kind === 'group');

  async function share(target: Target, to: string) {
    setBusy(target.id);
    setError(null);
    try {
      const conversation = target.kind === 'friend' ? (await social_api.direct(target.id)).id : target.id;
      await social_api.send(conversation, { run: run.id, text: note || undefined });
      setSent({ conversation, to });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal title="Share this run" onClose={onClose}>
      {sent ? (
        <Alert tone="success">
          Shared with {sent.to}. <Link to={`/chat/${sent.conversation}`}>Open the conversation</Link>
        </Alert>
      ) : null}
      {error ? <Alert>{describe(error)}</Alert> : null}
      {!social.friends.length ? (
        <p className="muted">
          Add friends to share your runs with them: <Link to="/friends">Friends</Link>.
        </p>
      ) : (
        <>
          <div className="field">
            <label htmlFor="share-run-note">A note (optional)</label>
            <input id="share-run-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Look at this one" />
          </div>
          <ul className="pick-list">
            {social.friends.map((f) => (
              <li key={f.id}>
                <button type="button" className="pick" disabled={!!busy} onClick={() => share({ kind: 'friend', id: f.id }, f.name ?? 'your friend')}>
                  <span className="person__avatar">
                    <Avatar name={f.name} seed={f.id} src={avatar_url(f.id, f.avatar)} size="sm" />
                    <PresenceDot presence={f.presence} />
                  </span>
                  <span className="pick__text">
                    <strong>{f.name ?? 'A player'}</strong>
                  </span>
                  {busy === f.id ? <span className="spinner" aria-hidden /> : <Icon name="send" />}
                </button>
              </li>
            ))}
            {groups.map((c) => (
              <li key={c.id}>
                <button type="button" className="pick" disabled={!!busy} onClick={() => share({ kind: 'conversation', id: c.id }, conversation_title(c, social.me?.id))}>
                  <span className="group-mark group-mark--sm" aria-hidden>
                    <Icon name="users" />
                  </span>
                  <span className="pick__text">
                    <strong>{conversation_title(c, social.me?.id)}</strong>
                    <span className="muted">{c.members.length} players</span>
                  </span>
                  {busy === c.id ? <span className="spinner" aria-hidden /> : <Icon name="send" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
