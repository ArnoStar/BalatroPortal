// The player's friends and conversations, kept up to date by the social
// service's event stream for every page: the sidebar's counts, the friends
// page, the chat. The stream is opened while the player is signed in (it
// makes them online for their friends), and opened again when it ends: its
// access token expired, it fell behind, or the connection broke. Each new
// stream reloads everything (events aren't kept while it is closed).
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import {
  avatar_versions,
  read_social_events,
  social_api,
  type Conversation,
  type FriendRequest,
  type MatchInvite,
  type SocialEvent,
  type SocialMe,
  type SocialPlayer,
} from '@/shared/api';

interface State {
  me: SocialMe | null;
  friends: SocialPlayer[];
  conversations: Conversation[];
  /** pending, to the player and from them */
  requests: FriendRequest[];
  /** open invites to friends' matches */
  invites: MatchInvite[];
  /** the event stream is open */
  live: boolean;
  /** the service couldn't be reached (the last try) */
  error: unknown;
}

type Action =
  | { type: 'loaded'; me: SocialMe; friends: SocialPlayer[]; conversations: Conversation[]; requests: FriendRequest[]; invites: MatchInvite[] }
  | { type: 'live'; live: boolean }
  | { type: 'error'; error: unknown }
  | { type: 'reset' }
  | { type: 'event'; event: SocialEvent };

const EMPTY: State = { me: null, friends: [], conversations: [], requests: [], invites: [], live: false, error: null };

const by_recent = (a: Conversation, b: Conversation) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id);
const by_presence = (a: SocialPlayer, b: SocialPlayer) =>
  Number(!!b.presence?.online) - Number(!!a.presence?.online) || (a.name ?? '').localeCompare(b.name ?? '') || a.id.localeCompare(b.id);

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

function apply(state: State, e: SocialEvent): State {
  const me = state.me?.id;
  switch (e.type) {
    case 'hello':
    case 'me':
      return { ...state, me: e.data };
    case 'message': {
      const m = e.data;
      const conversations = state.conversations.map((c) => (c.id !== m.conversation ? c : {
        ...c,
        last_message: m,
        last_seq: Math.max(c.last_seq, m.seq),
        updated_at: m.created_at,
        unread: m.sender && m.sender.id !== me ? c.unread + 1 : c.unread,
      }));
      return { ...state, conversations: conversations.sort(by_recent) };
    }
    case 'message_deleted':
      return {
        ...state,
        conversations: state.conversations.map((c) => (c.last_message?.id === e.data.id ? { ...c, last_message: e.data } : c)),
      };
    case 'read': {
      const r = e.data;
      return {
        ...state,
        conversations: state.conversations.map((c) => (c.id !== r.conversation ? c : {
          ...c,
          unread: r.player === me && r.seq >= c.last_seq ? 0 : c.unread,
          members: c.members.map((m) => (m.id === r.player ? { ...m, last_read: Math.max(m.last_read, r.seq) } : m)),
        })),
      };
    }
    case 'conversation':
      return { ...state, conversations: upsert(state.conversations, e.data).sort(by_recent) };
    case 'conversation_left':
      return { ...state, conversations: state.conversations.filter((c) => c.id !== e.data.id) };
    case 'friend_request': {
      const others = state.requests.filter((r) => r.id !== e.data.id);
      return { ...state, requests: e.data.status === 'pending' ? [e.data, ...others] : others };
    }
    case 'friend':
      return { ...state, friends: upsert(state.friends, e.data).sort(by_presence) };
    case 'friend_removed':
      return { ...state, friends: state.friends.filter((f) => f.id !== e.data.id) };
    case 'invite': {
      const others = state.invites.filter((i) => i.id !== e.data.id);
      return { ...state, invites: e.data.status === 'pending' && e.data.recipient.id === me ? [e.data, ...others] : others };
    }
    case 'presence':
      return {
        ...state,
        friends: state.friends.map((f) => (f.id === e.data.player ? { ...f, presence: e.data.presence } : f)).sort(by_presence),
      };
    default:
      return state;
  }
}

function reduce(state: State, a: Action): State {
  switch (a.type) {
    case 'loaded':
      return {
        ...state, me: a.me, friends: [...a.friends].sort(by_presence), conversations: [...a.conversations].sort(by_recent),
        requests: a.requests, invites: a.invites, error: null,
      };
    case 'live':
      return { ...state, live: a.live, error: a.live ? null : state.error };
    case 'error':
      return { ...state, error: a.error };
    case 'reset':
      return EMPTY;
    case 'event':
      return apply(state, a.event);
  }
}

export interface SocialValue extends State {
  /** signed in: the social service is for players with an account */
  enabled: boolean;
  /** messages waiting (muted conversations aside) */
  unread: number;
  /** friend requests waiting for the player's answer */
  incoming: FriendRequest[];
  /** reloads everything (after a change the events don't tell, or to retry) */
  reload: () => void;
  /** a change made here (an answer the service gave): applied as its event would be */
  apply: (event: SocialEvent) => void;
  /** every event, as it comes (the chat's messages, "... is writing"); returns the unsubscription */
  subscribe: (handler: (event: SocialEvent) => void) => () => void;
}

const SocialContext = createContext<SocialValue | null>(null);

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((done) => {
    const t = setTimeout(done, ms);
    signal.addEventListener('abort', () => { clearTimeout(t); done(); }, { once: true });
  });

/** `enabled`: a player is signed in (the app's session says so) */
export function SocialProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, EMPTY);
  const handlers = useRef(new Set<(e: SocialEvent) => void>());
  const known = useRef(new Set<string>());
  known.current = new Set(state.conversations.map((c) => c.id));

  const load = useCallback(async () => {
    try {
      const [me, friends, conversations, requests, invites] = await Promise.all([
        social_api.me(), social_api.friends(), social_api.conversations(), social_api.requests('all'),
        social_api.invites().catch(() => [] as MatchInvite[]),
      ]);
      dispatch({ type: 'loaded', me, friends, conversations, requests, invites });
    } catch (error) {
      dispatch({ type: 'error', error });
    }
  }, []);

  const emit = useCallback((event: SocialEvent) => {
    dispatch({ type: 'event', event });
    for (const h of handlers.current) h(event);
  }, []);

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: 'reset' });
      return;
    }
    const abort = new AbortController();
    const on_event = (event: SocialEvent) => {
      if (event.type === 'hello') {
        dispatch({ type: 'live', live: true });
        void load();
      } else if (event.type === 'message' && !known.current.has(event.data.conversation)) {
        // (a conversation this page hasn't seen: its first message)
        void social_api.conversation(event.data.conversation).then((c) => emit({ type: 'conversation', data: c }), () => undefined);
      }
      emit(event);
    };
    void (async () => {
      let delay = 0;
      while (!abort.signal.aborted) {
        try {
          await read_social_events(on_event, abort.signal);
          delay = 0; // (it ended on its own: open the next one at once)
        } catch (error) {
          if (abort.signal.aborted) return;
          dispatch({ type: 'error', error });
          delay = Math.min(60_000, delay ? delay * 2 : 2_000);
        }
        dispatch({ type: 'live', live: false });
        await wait(delay, abort.signal);
      }
    })();
    return () => abort.abort();
  }, [enabled, load, emit]);

  // the pictures this service's views name (yours, your friends', the chats' and requests'): every page shows the
  // new one at once (shared/ui Avatar looks the others up)
  useEffect(() => {
    if (state.me) avatar_versions.set(state.me.id, state.me.avatar);
    for (const f of state.friends) avatar_versions.set(f.id, f.avatar);
    for (const c of state.conversations) for (const m of c.members) avatar_versions.set(m.id, m.avatar);
    for (const r of state.requests) for (const p of [r.sender, r.recipient]) avatar_versions.set(p.id, p.avatar);
  }, [state.me, state.friends, state.conversations, state.requests]);

  const subscribe = useCallback((handler: (e: SocialEvent) => void) => {
    handlers.current.add(handler);
    return () => {
      handlers.current.delete(handler);
    };
  }, []);

  const value = useMemo<SocialValue>(() => ({
    ...state,
    enabled,
    unread: state.conversations.reduce((n, c) => n + (c.muted ? 0 : c.unread), 0),
    incoming: state.requests.filter((r) => r.recipient.id === state.me?.id),
    reload: () => void load(),
    apply: emit,
    subscribe,
  }), [state, enabled, load, emit, subscribe]);
  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial(): SocialValue {
  const value = useContext(SocialContext);
  if (!value) throw new Error('useSocial outside SocialProvider');
  return value;
}

/** calls `handler` with each live event while the component is shown */
export function useSocialEvent(handler: (event: SocialEvent) => void) {
  const { subscribe } = useSocial();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => subscribe((e) => ref.current(e)), [subscribe]);
}
