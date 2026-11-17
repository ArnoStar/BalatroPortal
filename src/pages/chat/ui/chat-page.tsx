import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { DECK_KEYS, DeckGlyph, STAKES, deck_name, stake_name } from '@/entities/catalog';
import {
  PresenceDot,
  conversation_title,
  message_preview,
  other_member,
  presence_text,
  system_text,
  useSocial,
  useSocialEvent,
} from '@/entities/social';
import { describe, game_api, social_api, type ChatMessage, type Conversation, type RunCard, type SeedCard } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { format_number, time_ago, use_async } from '@/shared/lib';
import { Alert, Avatar, Button, CopyText, EmptyState, Icon, Modal, PageHeader, Spinner } from '@/shared/ui';
import { current_lang, fmt_datetime, t, tp } from '@/shared/i18n';

const NAMES = { deck: deck_name, stake: stake_name };
const PAGE = 50;
const TYPING_SHOWN = 5000; // ms "… is writing" stays after the last sign
const TYPING_EVERY = 3000; // ms between two signs of ours

const play_seed_url = (s: SeedCard) =>
  `${GAME_URL}/?${new URLSearchParams({ seed: s.seed, deck: s.deck, stake: String(s.stake) })}`;
const watch_url = (run: string) => `${GAME_URL}/?watch=${encodeURIComponent(run)}`;
const clock = { format: (d: Date) => new Intl.DateTimeFormat(current_lang(), { timeStyle: 'short' }).format(d) };
const day = { format: (d: Date) => new Intl.DateTimeFormat(current_lang(), { dateStyle: 'medium' }).format(d) };

/** /chat and /chat/:id: conversations with friends and groups */
export function ChatPage() {
  const social = useSocial();
  const { id } = useParams();
  const [making, setMaking] = useState<'group' | 'direct' | null>(null);
  const open = social.conversations.find((c) => c.id === id) ?? null;
  return (
    <div className={`stack chat-page${id ? ' chat-page--open' : ''}`}>
      <PageHeader
        eyebrow={t('Social')}
        icon="chat"
        title={t('Chat')}
        lead={t('Write to your friends and groups, and share your runs and seeds with them.')}
        actions={
          <>
            <Button onClick={() => setMaking('direct')} icon={<Icon name="chat" />} disabled={!social.friends.length}>
              {t('New message')}
            </Button>
            <Button tone="grey" onClick={() => setMaking('group')} icon={<Icon name="users" />} disabled={!social.friends.length}>
              {t('New group')}
            </Button>
          </>
        }
      />
      {social.error && !social.me ? <Alert>{describe(social.error)}</Alert> : null}
      <div className={`chat${id ? ' chat--open' : ''}`}>
        <ConversationList active={id} />
        {id ? (
          open ? <Thread key={open.id} conversation={open} /> : <MissingThread id={id} />
        ) : (
          <section className="chat__thread chat__thread--empty">
            <EmptyState icon="chat" title={t('Pick a conversation')}>
              {social.friends.length ? t('Or start one with a friend.') : (
                <>
                  Add friends first: <Link to="/friends">{t('Friends')}</Link>.
                </>
              )}
            </EmptyState>
          </section>
        )}
      </div>
      {making === 'group' ? <NewGroup onClose={() => setMaking(null)} /> : null}
      {making === 'direct' ? <NewDirect onClose={() => setMaking(null)} /> : null}
    </div>
  );
}

function ConversationList({ active }: { active?: string }) {
  const social = useSocial();
  const me = social.me?.id;
  if (!social.me && !social.error) {
    return (
      <nav className="chat__list" aria-label={t('Conversations')}>
        <Spinner />
      </nav>
    );
  }
  return (
    <nav className="chat__list" aria-label={t('Conversations')}>
      {social.conversations.length === 0 ? <p className="muted chat__none">{t('No conversation yet.')}</p> : null}
      <ul>
        {social.conversations.map((c) => {
          const other = other_member(c, me);
          const friend = other ? social.friends.find((f) => f.id === other.id) : undefined;
          const title = conversation_title(c, me);
          return (
            <li key={c.id}>
              <Link
                to={`/chat/${c.id}`}
                className={`chat-item${c.id === active ? ' chat-item--active' : ''}${c.unread && !c.muted ? ' chat-item--unread' : ''}`}
                aria-current={c.id === active ? 'page' : undefined}
                viewTransition
              >
                <span className="person__avatar">
                  {c.kind === 'group' ? <span className="group-mark" aria-hidden><Icon name="users" /></span> : <Avatar name={title} player={other?.id} />}
                  {friend ? <PresenceDot presence={friend.presence} /> : null}
                </span>
                <span className="chat-item__text">
                  <span className="chat-item__title">
                    <strong>{title}</strong>
                    {c.muted ? <Icon name="bell-off" label={t('Muted')} /> : null}
                    <time dateTime={c.updated_at}>{time_ago(c.updated_at)}</time>
                  </span>
                  <span className="chat-item__last">
                    {c.last_message ? message_preview(c.last_message, me, c.kind === 'group') : t('No message yet')}
                  </span>
                </span>
                {c.unread ? (
                  <span className={`nav__badge${c.muted ? ' nav__badge--muted' : ''}`}>
                    {c.unread}
                    <span className="visually-hidden"> {t('unread')}</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** a conversation this page doesn't list (a link from elsewhere, or not yours) */
function MissingThread({ id }: { id: string }) {
  const social = useSocial();
  const c = use_async(() => social_api.conversation(id), [id]);
  useEffect(() => {
    if (c.data) social.apply({ type: 'conversation', data: c.data });
  }, [c.data]);
  return (
    <section className="chat__thread chat__thread--empty">
      {c.loading ? <Spinner /> : null}
      {c.error ? <Alert>{describe(c.error)}</Alert> : null}
    </section>
  );
}

function Thread({ conversation: c }: { conversation: Conversation }) {
  const social = useSocial();
  const navigate = useNavigate();
  const me = social.me?.id;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [typing, setTyping] = useState<Record<string, { name: string; until: number }>>({});
  const [now, setNow] = useState(Date.now());
  const [dialog, setDialog] = useState<'run' | 'seed' | 'members' | 'rename' | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true); // (follow new messages while the view is at the bottom)

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await social_api.messages(c.id, { limit: PAGE });
      setMessages(page);
      setMore(page.length === PAGE);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [c.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // a new stream (hello): what was written meanwhile
  useSocialEvent((e) => {
    if (e.type === 'hello') {
      const last = messages[messages.length - 1]?.seq ?? 0;
      void social_api.messages(c.id, { after: last, limit: 100 }).then((page) => setMessages((m) => merge(m, page)), () => undefined);
    } else if ((e.type === 'message' || e.type === 'message_deleted') && e.data.conversation === c.id) {
      setMessages((m) => merge(m, [e.data]));
      const sender = e.data.sender?.id;
      if (sender) {
        setTyping((prev) => {
          const rest = { ...prev };
          delete rest[sender];
          return rest;
        });
      }
    } else if (e.type === 'typing' && e.data.conversation === c.id) {
      setTyping((prev) => ({ ...prev, [e.data.player.id]: { name: e.data.player.name ?? t('Someone'), until: Date.now() + TYPING_SHOWN } }));
    } else if (e.type === 'conversation_left' && e.data.id === c.id) {
      navigate('/chat', { replace: true });
    }
  });

  // "… is writing" fades
  useEffect(() => {
    if (!Object.keys(typing).length) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [typing]);
  const writing = Object.values(typing).filter((w) => w.until > now).map((w) => w.name);

  // read: what is shown, while the page is seen
  const mine = c.members.find((m) => m.id === me);
  const last_seq = messages[messages.length - 1]?.seq ?? 0;
  useEffect(() => {
    const mark = () => {
      if (document.visibilityState === 'visible' && last_seq > (mine?.last_read ?? 0)) {
        void social_api.read(c.id, last_seq).catch(() => undefined);
      }
    };
    mark();
    document.addEventListener('visibilitychange', mark);
    return () => document.removeEventListener('visibilitychange', mark);
  }, [c.id, last_seq, mine?.last_read]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages, writing.length]);

  async function earlier() {
    const el = scroller.current;
    const height = el?.scrollHeight ?? 0;
    try {
      const page = await social_api.messages(c.id, { before: messages[0]?.seq, limit: PAGE });
      setMore(page.length === PAGE);
      stick.current = false;
      setMessages((m) => merge(m, page));
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - height;
      });
    } catch (e) {
      setError(e);
    }
  }

  async function act(what: 'mute' | 'leave') {
    try {
      if (what === 'mute') {
        social.apply({ type: 'conversation', data: await social_api.update_conversation(c.id, { muted: !c.muted }) });
      } else if (window.confirm(t('Leave this group? You can be added again by a member.'))) {
        await social_api.remove_member(c.id, me ?? '');
        social.apply({ type: 'conversation_left', data: { id: c.id } });
        navigate('/chat', { replace: true });
      }
    } catch (e) {
      setError(e);
    }
  }

  const other = other_member(c, me);
  const friend = other ? social.friends.find((f) => f.id === other.id) : undefined;
  const title = conversation_title(c, me);
  const seen_by = (m: ChatMessage) => c.members.filter((x) => x.id !== me && x.last_read >= m.seq);
  const my_last = [...messages].reverse().find((m) => m.sender?.id === me);
  return (
    <section className="chat__thread" aria-label={`Conversation: ${title}`}>
      <header className="thread__head">
        <Link to="/chat" className="icon-button thread__back" aria-label={t('All conversations')} viewTransition>
          <Icon name="chevron-left" />
        </Link>
        <span className="person__avatar">
          {c.kind === 'group' ? <span className="group-mark" aria-hidden><Icon name="users" /></span> : <Avatar name={title} player={other?.id} />}
          {friend ? <PresenceDot presence={friend.presence} /> : null}
        </span>
        <div className="thread__title">
          <h2>{title}</h2>
          <span className="muted">
            {c.kind === 'group'
              ? `${tp(c.members.length, '# player', '# players')}: ${c.members.map((m) => (m.id === me ? t('you') : m.name ?? t('a player'))).join(', ')}`
              : friend ? presence_text(friend.presence, NAMES, time_ago) : t('Not your friend any more')}
          </span>
        </div>
        <div className="thread__actions">
          {c.kind === 'group' ? (
            <>
              <button type="button" className="icon-button" onClick={() => setDialog('members')} aria-label={t('Add players')} title={t('Add players')}>
                <Icon name="user-plus" />
              </button>
              <button type="button" className="icon-button" onClick={() => setDialog('rename')} aria-label={t('Rename the group')} title={t('Rename')}>
                <Icon name="edit" />
              </button>
            </>
          ) : other ? (
            <Link to={`/players/${encodeURIComponent(other.id)}`} className="icon-button" aria-label={`${title}'s profile`} title={t('Profile')} viewTransition>
              <Icon name="user" />
            </Link>
          ) : null}
          <button type="button" className="icon-button" onClick={() => act('mute')} aria-label={c.muted ? t('Unmute') : t('Mute')} title={c.muted ? t('Unmute') : t('Mute')}>
            <Icon name={c.muted ? 'bell' : 'bell-off'} />
          </button>
          {c.kind === 'group' ? (
            <button type="button" className="icon-button" onClick={() => act('leave')} aria-label={t('Leave the group')} title={t('Leave')}>
              <Icon name="logout" />
            </button>
          ) : null}
        </div>
      </header>
      <div
        className="thread__messages"
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        aria-live="polite"
      >
        {more ? (
          <div className="thread__more">
            <Button size="sm" tone="ghost" onClick={earlier} icon={<Icon name="history" />}>
              {t('Earlier messages')}
            </Button>
          </div>
        ) : null}
        {loading && !messages.length ? <Spinner /> : null}
        {!loading && !messages.length ? <p className="muted thread__start">{t('No message yet: say hi, or share a run.')}</p> : null}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const new_day = !prev || day.format(new Date(prev.created_at)) !== day.format(new Date(m.created_at));
          return (
            <div key={m.id} className="thread__row">
              {new_day ? <p className="thread__day">{day.format(new Date(m.created_at))}</p> : null}
              <Message
                message={m}
                me={me}
                group={c.kind === 'group'}
                first={!prev || new_day || prev.sender?.id !== m.sender?.id || prev.kind === 'system'}
                onDelete={async () => {
                  try {
                    const gone = await social_api.delete_message(c.id, m.id);
                    setMessages((list) => merge(list, [gone]));
                  } catch (e) {
                    setError(e);
                  }
                }}
              />
              {my_last?.id === m.id && c.kind === 'direct' && seen_by(m).length ? <p className="thread__seen">{t('Seen')}</p> : null}
              {my_last?.id === m.id && c.kind === 'group' && seen_by(m).length ? (
                <p className="thread__seen">{t('Seen by {names}', { names: seen_by(m).map((x) => x.name ?? t('a player')).join(', ') })}</p>
              ) : null}
            </div>
          );
        })}
        {writing.length ? (
          <p className="thread__typing">
            <span className="typing-dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            {writing.length > 1 ? t('{names} are writing…', { names: writing.join(', ') }) : t('{name} is writing…', { name: writing[0] })}
          </p>
        ) : null}
      </div>
      {error ? <Alert>{describe(error)}</Alert> : null}
      {c.can_send ? (
        <Composer conversation={c} onShare={setDialog} onSent={(m) => {
          stick.current = true;
          setMessages((list) => merge(list, [m]));
        }} />
      ) : (
        <p className="thread__closed muted">
          <Icon name="lock" /> {t('You aren’t friends any more: this conversation can be read, not written to.')}
        </p>
      )}
      {dialog === 'run' ? <ShareRun conversation={c.id} onClose={() => setDialog(null)} onSent={(m) => setMessages((list) => merge(list, [m]))} /> : null}
      {dialog === 'seed' ? <ShareSeed conversation={c.id} onClose={() => setDialog(null)} onSent={(m) => setMessages((list) => merge(list, [m]))} /> : null}
      {dialog === 'members' ? <AddMembers conversation={c} onClose={() => setDialog(null)} /> : null}
      {dialog === 'rename' ? <Rename conversation={c} onClose={() => setDialog(null)} /> : null}
    </section>
  );
}

/** the messages of a list and `more`, by number, each once (the latest copy wins) */
function merge(list: ChatMessage[], more: ChatMessage[]): ChatMessage[] {
  const by = new Map(list.map((m) => [m.id, m]));
  for (const m of more) by.set(m.id, m);
  return [...by.values()].sort((a, b) => a.seq - b.seq);
}

function Message({ message: m, me, group, first, onDelete }: {
  message: ChatMessage; me?: string; group: boolean; first: boolean; onDelete: () => void;
}) {
  if (m.kind === 'system' && m.system) {
    return <p className="message-system">{system_text(m.system, me)}</p>;
  }
  const mine = m.sender?.id === me;
  return (
    <div className={`message${mine ? ' message--mine' : ''}${first ? ' message--first' : ''}`}>
      {!mine && group && first && m.sender ? (
        <span className="message__who">
          <Avatar name={m.sender.name} player={m.sender.id} size="sm" />
          {m.sender.name ?? t('A player')}
        </span>
      ) : null}
      <div className={`message__bubble${m.deleted ? ' message__bubble--deleted' : ''}${m.run || m.seed ? ' message__bubble--card' : ''}`}>
        {m.deleted ? (
          <span className="muted">
            <Icon name="trash" /> {t('Deleted')}
          </span>
        ) : (
          <>
            {m.run ? <RunShare run={m.run} /> : null}
            {m.seed ? <SeedShare seed={m.seed} /> : null}
            {m.text ? <p className="message__text">{m.text}</p> : null}
          </>
        )}
        <span className="message__meta">
          <time dateTime={m.created_at} title={fmt_datetime(m.created_at)}>
            {clock.format(new Date(m.created_at))}
          </time>
          {mine && !m.deleted ? (
            <button type="button" className="message__delete" onClick={() => window.confirm(t('Delete this message for everyone?')) && onDelete()} aria-label={t('Delete this message')}>
              <Icon name="trash" />
            </button>
          ) : null}
        </span>
      </div>
    </div>
  );
}

function RunShare({ run }: { run: RunCard }) {
  const state = run.finished ? (run.won ? 'won' : 'lost') : 'live';
  return (
    <div className={`share-card share-card--${state}`}>
      <div className="share-card__head">
        <DeckGlyph deck={run.deck} />
        <div>
          <strong>{deck_name(run.deck)}</strong>
          <span className={`stake stake--${run.stake}`}>{stake_name(run.stake)}</span>
        </div>
        <span className={`status status--${state}`}>
          <Icon name={state === 'won' ? 'check-circle' : state === 'lost' ? 'x-circle' : 'dot'} />
          {state === 'won' ? t('Won') : state === 'lost' ? t('Lost') : t('Playing')}
        </span>
      </div>
      <dl className="share-card__stats">
        <div>
          <dt>{t('Ante')}</dt>
          <dd>{run.ante}</dd>
        </div>
        <div>
          <dt>{t('Round')}</dt>
          <dd>{run.round}</dd>
        </div>
        {run.best_hand ? (
          <div>
            <dt>{t('Best hand')}</dt>
            <dd>{format_number(run.best_hand)}</dd>
          </div>
        ) : null}
      </dl>
      <div className="share-card__actions">
        <CopyText text={run.seed} label={t('Seed')}>
          {t('Seed {seed}', { seed: run.seed })}
        </CopyText>
        {run.finished ? (
          <a className="btn btn--grey btn--sm" href={watch_url(run.id)}>
            <Icon name="eye" />
            {t('Watch')}
          </a>
        ) : null}
        <a className="btn btn--blue btn--sm" href={play_seed_url({ seed: run.seed, deck: run.deck, stake: run.stake })}>
          <Icon name="play" />
          {t('Play this seed')}
        </a>
      </div>
    </div>
  );
}

function SeedShare({ seed }: { seed: SeedCard }) {
  return (
    <div className="share-card">
      <div className="share-card__head">
        <DeckGlyph deck={seed.deck} />
        <div>
          <strong>{t('Seed {seed}', { seed: seed.seed })}</strong>
          <span>
            {deck_name(seed.deck)} · <span className={`stake stake--${seed.stake}`}>{stake_name(seed.stake)}</span>
          </span>
        </div>
      </div>
      <div className="share-card__actions">
        <CopyText text={seed.seed} label={t('Seed')}>
          {t('Copy')}
        </CopyText>
        <a className="btn btn--blue btn--sm" href={play_seed_url(seed)}>
          <Icon name="play" />
          {t('Play it')}
        </a>
      </div>
    </div>
  );
}

function Composer({ conversation: c, onShare, onSent }: {
  conversation: Conversation; onShare: (what: 'run' | 'seed') => void; onSent: (m: ChatMessage) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const signed = useRef(0);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      onSent(await social_api.send(c.id, { text }));
      setText('');
      signed.current = 0;
      const box = document.getElementById(`compose-${c.id}`);
      if (box) box.style.height = '';
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  function key(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  }

  function changed(el: HTMLTextAreaElement) {
    const value = el.value;
    // (the box grows with what is written, up to its max-height)
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
    setText(value);
    if (value.trim() && Date.now() - signed.current > TYPING_EVERY) {
      signed.current = Date.now();
      void social_api.typing(c.id).catch(() => undefined);
    }
  }

  return (
    <form className="composer" onSubmit={send}>
      {error ? <Alert>{describe(error)}</Alert> : null}
      <div className="composer__row">
        <button type="button" className="icon-button" onClick={() => onShare('run')} aria-label={t('Share a run')} title={t('Share a run')}>
          <Icon name="share" />
        </button>
        <button type="button" className="icon-button" onClick={() => onShare('seed')} aria-label={t('Share a seed')} title={t('Share a seed')}>
          <Icon name="hash" />
        </button>
        <label className="visually-hidden" htmlFor={`compose-${c.id}`}>
          {t('Your message')}
        </label>
        <textarea
          id={`compose-${c.id}`}
          className="composer__input"
          rows={1}
          maxLength={2000}
          value={text}
          onChange={(e) => changed(e.target)}
          onKeyDown={key}
          placeholder={t('Write a message')}
          title={t('Enter sends, Shift+Enter makes a new line')}
        />
        <Button type="submit" busy={busy} disabled={!text.trim()} icon={<Icon name="send" />} aria-label={t('Send')}>
          {t('Send')}
        </Button>
      </div>
    </form>
  );
}

function ShareRun({ conversation, onClose, onSent }: { conversation: string; onClose: () => void; onSent: (m: ChatMessage) => void }) {
  const runs = use_async(() => game_api.runs(20), []);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  async function share(run: string) {
    setBusy(run);
    setError(null);
    try {
      onSent(await social_api.send(conversation, { run, text: note || undefined }));
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }
  return (
    <Modal title={t('Share a run')} onClose={onClose} wide>
      <div className="field">
        <label htmlFor="share-note">{t('A note (optional)')}</label>
        <input id="share-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder={t('Beat that!')} />
      </div>
      {runs.loading ? <Spinner /> : null}
      {runs.error ? <Alert>{describe(runs.error)}</Alert> : null}
      {error ? <Alert>{describe(error)}</Alert> : null}
      {runs.data?.length === 0 ? <p className="muted">{t('No run yet: play one first.')}</p> : null}
      <ul className="pick-list">
        {runs.data?.map((r) => (
          <li key={r.id}>
            <button type="button" className="pick" onClick={() => share(r.id)} disabled={!!busy}>
              <DeckGlyph deck={r.settings.deck} size="sm" />
              <span className="pick__text">
                <strong>{deck_name(r.settings.deck)}</strong>
                <span className="muted">
                  {stake_name(r.settings.stake)} · {t('Ante {n}', { n: r.ante })} · {r.won ? t('won') : r.phase === 'game_over' ? t('lost') : t('playing')}
                  {r.best_hand ? ` · ${t('best hand {score}', { score: format_number(r.best_hand) })}` : ''} · {time_ago(r.updated_at)}
                </span>
              </span>
              {busy === r.id ? <span className="spinner" aria-hidden /> : <Icon name="send" />}
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function ShareSeed({ conversation, onClose, onSent }: { conversation: string; onClose: () => void; onSent: (m: ChatMessage) => void }) {
  const [seed, setSeed] = useState('');
  const [deck, setDeck] = useState('b_red');
  const [stake, setStake] = useState(1);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function share(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSent(await social_api.send(conversation, { seed: { seed, deck, stake }, text: note || undefined }));
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={t('Share a seed')} onClose={onClose}>
      <form className="stack stack--tight" onSubmit={share}>
        <div className="field">
          <label htmlFor="seed-value">{t('Seed')}</label>
          <input id="seed-value" value={seed} maxLength={8} required onChange={(e) => setSeed(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder={t('8 letters and digits')} spellCheck={false} />
        </div>
        <div className="grid-2 grid-2--tight">
          <div className="field">
            <label htmlFor="seed-deck">{t('Deck')}</label>
            <select id="seed-deck" value={deck} onChange={(e) => setDeck(e.target.value)}>
              {DECK_KEYS.map((k) => (
                <option key={k} value={k}>
                  {deck_name(k)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="seed-stake">{t('Stake')}</label>
            <select id="seed-stake" value={stake} onChange={(e) => setStake(Number(e.target.value))}>
              {STAKES.map((s, i) => (
                <option key={s} value={i + 1}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="seed-note">{t('A note (optional)')}</label>
          <input id="seed-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder={t('Try it: crazy shop at ante 2')} />
        </div>
        {error ? <Alert>{describe(error)}</Alert> : null}
        <Button type="submit" busy={busy} disabled={!seed} icon={<Icon name="send" />}>
          {t('Share')}
        </Button>
      </form>
    </Modal>
  );
}

/** pick some of one's friends */
function FriendPicker({ exclude = [], chosen, onChange, single = false }: {
  exclude?: string[]; chosen: string[]; onChange: (ids: string[]) => void; single?: boolean;
}) {
  const social = useSocial();
  const friends = social.friends.filter((f) => !exclude.includes(f.id));
  if (!friends.length) return <p className="muted">{t('No friend to add.')}</p>;
  return (
    <ul className="pick-list">
      {friends.map((f) => {
        const on = chosen.includes(f.id);
        return (
          <li key={f.id}>
            <label className={`pick${on ? ' pick--on' : ''}`}>
              <input
                type={single ? 'radio' : 'checkbox'}
                name="friend"
                checked={on}
                onChange={() => onChange(single ? [f.id] : on ? chosen.filter((x) => x !== f.id) : [...chosen, f.id])}
              />
              <span className="person__avatar">
                <Avatar name={f.name} player={f.id} size="sm" />
                <PresenceDot presence={f.presence} />
              </span>
              <span className="pick__text">
                <strong>{f.name ?? t('A player')}</strong>
                <span className="muted">{presence_text(f.presence, NAMES, time_ago)}</span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function NewDirect({ onClose }: { onClose: () => void }) {
  const social = useSocial();
  const navigate = useNavigate();
  const [chosen, setChosen] = useState<string[]>([]);
  const [error, setError] = useState<unknown>(null);
  async function open(ids: string[]) {
    setChosen(ids);
    try {
      const c = await social_api.direct(ids[0]);
      social.apply({ type: 'conversation', data: c });
      onClose();
      navigate(`/chat/${c.id}`, { viewTransition: true });
    } catch (e) {
      setError(e);
    }
  }
  return (
    <Modal title={t('Write to a friend')} onClose={onClose}>
      {error ? <Alert>{describe(error)}</Alert> : null}
      <FriendPicker chosen={chosen} onChange={open} single />
    </Modal>
  );
}

function NewGroup({ onClose }: { onClose: () => void }) {
  const social = useSocial();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const c = await social_api.create_group(title, chosen);
      social.apply({ type: 'conversation', data: c });
      onClose();
      navigate(`/chat/${c.id}`, { viewTransition: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={t('A new group')} onClose={onClose}>
      <form className="stack stack--tight" onSubmit={create}>
        <div className="field">
          <label htmlFor="group-title">{t('Its name')}</label>
          <input id="group-title" value={title} maxLength={40} required onChange={(e) => setTitle(e.target.value)} placeholder={t('The Jimbos')} />
        </div>
        <p className="muted">{t('Friends in it (up to 19):')}</p>
        <FriendPicker chosen={chosen} onChange={setChosen} />
        {error ? <Alert>{describe(error)}</Alert> : null}
        <Button type="submit" busy={busy} disabled={!title.trim() || !chosen.length} icon={<Icon name="users" />}>
          {t('Make the group')}
        </Button>
      </form>
    </Modal>
  );
}

function AddMembers({ conversation: c, onClose }: { conversation: Conversation; onClose: () => void }) {
  const social = useSocial();
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const me = social.me?.id;
  async function add() {
    setBusy(true);
    setError(null);
    try {
      social.apply({ type: 'conversation', data: await social_api.add_members(c.id, chosen) });
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function remove(player: string) {
    if (!window.confirm(t('Remove this player from the group?'))) return;
    try {
      const view = await social_api.remove_member(c.id, player);
      if (view) social.apply({ type: 'conversation', data: view });
    } catch (e) {
      setError(e);
    }
  }
  return (
    <Modal title={t('The group’s players')} onClose={onClose}>
      <ul className="people">
        {c.members.map((m) => (
          <li key={m.id} className="person">
            <span className="person__avatar">
              <Avatar name={m.name} player={m.id} size="sm" />
            </span>
            <div className="person__info">
              <span className="person__name">
                {m.id === me ? t('You') : m.name ?? t('A player')}
                {m.owner ? <span className="tag tag--gold">{t('Owner')}</span> : null}
              </span>
            </div>
            {c.owner === me && m.id !== me ? (
              <div className="person__actions">
                <Button size="sm" tone="ghost" onClick={() => remove(m.id)} icon={<Icon name="user-minus" />}>
                  {t('Remove')}
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="muted">{t('Add friends of yours (they read what is written from now on):')}</p>
      <FriendPicker exclude={c.members.map((m) => m.id)} chosen={chosen} onChange={setChosen} />
      {error ? <Alert>{describe(error)}</Alert> : null}
      <Button onClick={add} busy={busy} disabled={!chosen.length} icon={<Icon name="user-plus" />}>
        {t('Add them')}
      </Button>
    </Modal>
  );
}

function Rename({ conversation: c, onClose }: { conversation: Conversation; onClose: () => void }) {
  const social = useSocial();
  const [title, setTitle] = useState(c.title ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      social.apply({ type: 'conversation', data: await social_api.update_conversation(c.id, { title }) });
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={t('Rename the group')} onClose={onClose}>
      <form className="stack stack--tight" onSubmit={save}>
        <div className="field">
          <label htmlFor="rename-title">{t('Its name')}</label>
          <input id="rename-title" value={title} maxLength={40} required onChange={(e) => setTitle(e.target.value)} />
        </div>
        {error ? <Alert>{describe(error)}</Alert> : null}
        <Button type="submit" busy={busy} disabled={!title.trim()} icon={<Icon name="check" />}>
          {t('Rename')}
        </Button>
      </form>
    </Modal>
  );
}
