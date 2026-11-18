import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { conversation_title, message_preview, useSocial, useSocialEvent } from '@/entities/social';
import { describe, social_api, type ChatMessage, type Conversation, type FriendRequest, type MatchInvite, type SocialEvent } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { t } from '@/shared/i18n';
import { Avatar, Button, Icon } from '@/shared/ui';

/** a pop-up: something new for the player */
type Pop =
  | { key: string; kind: 'request'; request: FriendRequest }
  | { key: string; kind: 'message'; message: ChatMessage }
  | { key: string; kind: 'invite'; invite: MatchInvite };

const SHOWN_MS = { request: 9_000, message: 7_000, invite: 30_000 };

function invite_text(i: MatchInvite): string {
  return i.mode === 'coop'
    ? t('{name} invites you to play coop', { name: i.sender.name ?? t('A player') })
    : t('{name} invites you to a PvP match', { name: i.sender.name ?? t('A player') });
}

/** the game, joining a friend's match */
function join(i: MatchInvite) {
  window.location.assign(`${GAME_URL}/?match=${encodeURIComponent(i.code)}`);
}

function useAnswers() {
  const social = useSocial();
  const [error, setError] = useState<string | null>(null);
  const answer_request = async (r: FriendRequest, answer: 'accept' | 'decline') => {
    try {
      social.apply({ type: 'friend_request', data: await social_api.answer(r.id, answer) });
      if (answer === 'accept') social.reload();
    } catch (e) {
      setError(describe(e));
    }
  };
  const answer_invite = async (i: MatchInvite, answer: 'accept' | 'decline') => {
    try {
      social.apply({ type: 'invite', data: await social_api.answer_invite(i.id, answer) });
    } catch (e) {
      if (answer === 'decline') setError(describe(e));
    }
    if (answer === 'accept') join(i); // (an expired invite: the game says so)
  };
  return { error, answer_request, answer_invite };
}

function RequestRow({ r, onDone }: { r: FriendRequest; onDone?: () => void }) {
  const { answer_request } = useAnswers();
  return (
    <div className="note note--request">
      <Avatar name={r.sender.name} player={r.sender.id} size="sm" />
      <p className="note__text">{t('{name} wants to be your friend', { name: r.sender.name ?? t('A player') })}</p>
      <div className="note__actions">
        <Button size="sm" tone="ghost" onClick={() => { void answer_request(r, 'decline'); onDone?.(); }}>{t('Decline')}</Button>
        <Button size="sm" onClick={() => { void answer_request(r, 'accept'); onDone?.(); }}>{t('Accept')}</Button>
      </div>
    </div>
  );
}

function InviteRow({ i, onDone }: { i: MatchInvite; onDone?: () => void }) {
  const { answer_invite } = useAnswers();
  return (
    <div className="note note--invite">
      <Avatar name={i.sender.name} player={i.sender.id} size="sm" />
      <p className="note__text">{invite_text(i)}</p>
      <div className="note__actions">
        <Button size="sm" tone="ghost" onClick={() => { void answer_invite(i, 'decline'); onDone?.(); }}>{t('Decline')}</Button>
        <Button size="sm" icon={<Icon name="play" />} onClick={() => void answer_invite(i, 'accept')}>{t('Join')}</Button>
      </div>
    </div>
  );
}

function MessageRow({ c, m, me, onDone }: { c?: Conversation; m: ChatMessage; me: string | undefined; onDone?: () => void }) {
  const group = c?.kind === 'group';
  const title = c ? conversation_title(c, me) : m.sender?.name ?? t('A player');
  const unread = c?.unread ?? 1;
  return (
    <Link className="note note--message" to={`/chat/${encodeURIComponent(m.conversation)}`} onClick={onDone}>
      <Avatar name={m.sender?.name} player={m.sender?.id} size="sm" />
      <span className="note__text">
        <span className="note__title">
          <strong>{title}</strong>
          {unread > 1 ? <span className="note__count">{unread}</span> : null}
        </span>
        <span className="note__preview">{message_preview(m, me, group)}</span>
      </span>
    </Link>
  );
}

/**
 * The notification bell (top right of every page) and the pop-ups: friend requests, messages and invites to a
 * friend's match, as they come (the social service's event stream). For signed-in players.
 */
export function Notifications() {
  const social = useSocial();
  const me = social.me?.id;
  const [open, setOpen] = useState(false);
  const [pops, setPops] = useState<Pop[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const now = Date.now();
  const invites = social.invites.filter((i) => Date.parse(i.expires_at) > now);
  const unread = social.conversations.filter((c) => c.unread > 0 && !c.muted && c.last_message);
  const count = social.incoming.length + unread.length + invites.length;

  const drop = (key: string) => setPops((list) => list.filter((p) => p.key !== key));
  const pop = (p: Pop) => {
    setPops((list) => [p, ...list.filter((x) => x.key !== p.key)].slice(0, 3));
    setTimeout(() => drop(p.key), SHOWN_MS[p.kind]);
  };

  useSocialEvent((e: SocialEvent) => {
    if (e.type === 'friend_request' && e.data.status === 'pending' && e.data.recipient.id === me) {
      pop({ key: `r${e.data.id}`, kind: 'request', request: e.data });
    } else if (e.type === 'invite' && e.data.status === 'pending' && e.data.recipient.id === me) {
      pop({ key: `i${e.data.id}`, kind: 'invite', invite: e.data });
    } else if (e.type === 'message' && e.data.sender && e.data.sender.id !== me && e.data.kind !== 'system') {
      const c = social.conversations.find((x) => x.id === e.data.conversation);
      if (c?.muted || pathname === `/chat/${e.data.conversation}`) return;
      pop({ key: `m${e.data.conversation}`, kind: 'message', message: e.data });
    }
  });

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  if (!social.enabled) return null;
  return (
    <div className="notes" ref={box}>
      <button
        type="button"
        className="icon-button notes__bell"
        aria-label={count ? t('Notifications ({n})', { n: count }) : t('Notifications')}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="bell" />
        {count ? <span className="notes__badge">{count > 99 ? '99+' : count}</span> : null}
      </button>
      {open ? (
        <div className="notes__panel" role="dialog" aria-label={t('Notifications')}>
          <h2>{t('Notifications')}</h2>
          {invites.map((i) => <InviteRow key={i.id} i={i} />)}
          {social.incoming.map((r) => <RequestRow key={r.id} r={r} />)}
          {unread.map((c) => <MessageRow key={c.id} c={c} m={c.last_message!} me={me} />)}
          {count === 0 ? <p className="notes__empty">{t('Nothing new')}</p> : null}
          <div className="notes__more">
            <Button size="sm" tone="ghost" onClick={() => navigate('/friends')}>{t('Friends')}</Button>
            <Button size="sm" tone="ghost" onClick={() => navigate('/chat')}>{t('Chat')}</Button>
          </div>
        </div>
      ) : null}
      <div className="notes__pops" aria-live="polite">
        {pops.map((p) => (
          <div key={p.key} className="notes__pop">
            {p.kind === 'request' ? <RequestRow r={p.request} onDone={() => drop(p.key)} />
              : p.kind === 'invite' ? <InviteRow i={p.invite} onDone={() => drop(p.key)} />
                : <MessageRow c={social.conversations.find((c) => c.id === p.message.conversation)} m={p.message} me={me} onDone={() => drop(p.key)} />}
          </div>
        ))}
      </div>
    </div>
  );
}
