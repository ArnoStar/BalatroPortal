// The social service (BalatroSocial): friends, chat, presence, runs and seeds
// shared with friends, and the player's live events (server-sent events, read
// with fetch: an EventSource can't send the access token).
import { SOCIAL_BASE } from '@/shared/config';
import { ProblemError, read_json } from './problem';
import { authorized_fetch } from './session';

export type Relation = 'you' | 'friend' | 'incoming' | 'outgoing' | 'blocked' | 'none';
/** `avatar`: their profile picture's version (avatar_url), null: none */
export interface PlayerRef { id: string; name: string | null; avatar: number | null }

/** what a friend does in the game */
export interface Activity {
  kind: 'menu' | 'run' | 'watching';
  deck: string | null;
  stake: number | null;
  ante: number | null;
  seeded: boolean;
  challenge: string | null;
}

/** friends' only (others see everyone offline) */
export interface Presence { online: boolean; activity: Activity | null; last_seen: string | null }

export interface SocialPlayer {
  id: string;
  name: string | null;
  relation: Relation;
  avatar: number | null;
  /** the friend request waiting between you */
  request: string | null;
  presence: Presence | null;
  since: string | null;
  /** your direct conversation, if there is one */
  conversation: string | null;
}

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export interface FriendRequest { id: string; sender: PlayerRef; recipient: PlayerRef; status: RequestStatus; created_at: string; updated_at: string }

export interface SocialMe {
  id: string;
  name: string | null;
  /** ABCD-2345: an invite link carries it (/friends/add/<code>) */
  friend_code: string;
  avatar: number | null;
  /** who may send you a friend request: everyone, or only with your code */
  requests: 'everyone' | 'code';
  show_presence: boolean;
  friends: number;
  incoming: number;
  unread: number;
}

/** a run as it was when it was shared */
export interface RunCard {
  id: string;
  deck: string;
  stake: number;
  seed: string;
  seeded: boolean;
  challenge: string | null;
  ante: number;
  round: number;
  won: boolean;
  finished: boolean;
  best_hand: number;
  counted: boolean;
  played_at: string;
}

export interface SeedCard { seed: string; deck: string; stake: number }

export interface SystemNote {
  event: 'created' | 'renamed' | 'added' | 'removed' | 'left';
  by: PlayerRef | null;
  players: PlayerRef[];
  title: string | null;
}

export interface ChatMessage {
  id: string;
  conversation: string;
  /** 1, 2, ... in its conversation */
  seq: number;
  sender: PlayerRef | null;
  kind: 'text' | 'run' | 'seed' | 'system';
  text: string;
  created_at: string;
  deleted: boolean;
  run: RunCard | null;
  seed: SeedCard | null;
  system: SystemNote | null;
}

export interface ChatMember { id: string; name: string | null; avatar: number | null; owner: boolean; last_read: number }

export interface Conversation {
  id: string;
  kind: 'direct' | 'group';
  title: string | null;
  owner: string | null;
  members: ChatMember[];
  last_seq: number;
  last_message: ChatMessage | null;
  unread: number;
  muted: boolean;
  /** false: a direct conversation with a player who isn't your friend any more */
  can_send: boolean;
  created_at: string;
  updated_at: string;
}

/** the live events (BalatroSocial's docs/events.md) */
export type SocialEvent =
  | { type: 'hello' | 'me'; data: SocialMe }
  | { type: 'message' | 'message_deleted'; data: ChatMessage }
  | { type: 'read'; data: { conversation: string; player: string; seq: number } }
  | { type: 'typing'; data: { conversation: string; player: PlayerRef } }
  | { type: 'conversation'; data: Conversation }
  | { type: 'conversation_left' | 'friend_removed'; data: { id: string } }
  | { type: 'friend_request'; data: FriendRequest }
  | { type: 'friend'; data: SocialPlayer }
  | { type: 'presence'; data: { player: string; presence: Presence } }
  | { type: 'expired' | 'reset'; data: Record<string, never> };

const url = (path: string) => `${SOCIAL_BASE}${path}`;
const json = { 'content-type': 'application/json' };
const id = encodeURIComponent;
const get = <T,>(path: string) => authorized_fetch(url(path)).then((r) => read_json<T>(r));
const send = <T,>(method: string, path: string, body?: unknown) =>
  authorized_fetch(url(path), { method, headers: json, body: body === undefined ? undefined : JSON.stringify(body) })
    .then((r) => read_json<T>(r));

/** a player's profile picture, for an <img> (null: they have none: their initials) */
export const avatar_url = (player: string, version: number | null | undefined) =>
  version ? `${SOCIAL_BASE}/v1/avatars/${encodeURIComponent(player)}?v=${version}` : null;

export const social_api = {
  /** a PNG, JPEG or WebP image (256 KB at most: the portal sends a 256 x 256 WebP) */
  set_avatar: (image: Blob) =>
    authorized_fetch(url('/v1/me/avatar'), { method: 'PUT', headers: { 'content-type': image.type }, body: image })
      .then((r) => read_json<SocialMe>(r)),
  remove_avatar: () => send<SocialMe>('DELETE', '/v1/me/avatar'),
  me: () => get<SocialMe>('/v1/me'),
  update_me: (changes: { requests?: SocialMe['requests']; show_presence?: boolean }) => send<SocialMe>('PATCH', '/v1/me', changes),
  /** a new friend code: the old one and its links stop working */
  new_code: () => send<SocialMe>('POST', '/v1/me/code'),
  find: (q: string) => get<SocialPlayer[]>(`/v1/players?q=${id(q)}`),
  player: (player: string) => get<SocialPlayer>(`/v1/players/${id(player)}`),
  by_code: (code: string) => get<SocialPlayer>(`/v1/codes/${id(code)}`),
  friends: () => get<SocialPlayer[]>('/v1/friends'),
  remove_friend: (player: string) => send<void>('DELETE', `/v1/friends/${id(player)}`),
  requests: (box: 'incoming' | 'outgoing' | 'all' = 'all') => get<FriendRequest[]>(`/v1/friends/requests?box=${box}`),
  ask: (target: { to: string } | { code: string }) => send<FriendRequest>('POST', '/v1/friends/requests', target),
  answer: (request: string, answer: 'accept' | 'decline' | 'cancel') =>
    send<FriendRequest>('POST', `/v1/friends/requests/${id(request)}/${answer}`),
  blocks: () => get<SocialPlayer[]>('/v1/blocks'),
  block: (player: string) => send<SocialPlayer>('PUT', `/v1/blocks/${id(player)}`),
  unblock: (player: string) => send<void>('DELETE', `/v1/blocks/${id(player)}`),
  conversations: () => get<Conversation[]>('/v1/conversations'),
  conversation: (c: string) => get<Conversation>(`/v1/conversations/${id(c)}`),
  /** your conversation with a friend (made the first time) */
  direct: (player: string) => send<Conversation>('POST', '/v1/conversations/direct', { player }),
  create_group: (title: string, members: string[]) => send<Conversation>('POST', '/v1/conversations', { title, members }),
  update_conversation: (c: string, changes: { title?: string; muted?: boolean }) =>
    send<Conversation>('PATCH', `/v1/conversations/${id(c)}`, changes),
  add_members: (c: string, players: string[]) => send<Conversation>('POST', `/v1/conversations/${id(c)}/members`, { players }),
  /** leaving (yourself: nothing back), or the owner removing a player (the group) */
  remove_member: (c: string, player: string) =>
    send<Conversation | undefined>('DELETE', `/v1/conversations/${id(c)}/members/${id(player)}`),
  messages: (c: string, page: { before?: number; after?: number; limit?: number } = {}) => {
    const q = new URLSearchParams(Object.entries(page).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return get<ChatMessage[]>(`/v1/conversations/${id(c)}/messages?${q}`);
  },
  send: (c: string, message: { text?: string; run?: string; seed?: SeedCard }) =>
    send<ChatMessage>('POST', `/v1/conversations/${id(c)}/messages`, message),
  delete_message: (c: string, message: string) => send<ChatMessage>('DELETE', `/v1/conversations/${id(c)}/messages/${id(message)}`),
  read: (c: string, seq: number) => send<void>('POST', `/v1/conversations/${id(c)}/read`, { seq }),
  typing: (c: string) => send<void>('POST', `/v1/conversations/${id(c)}/typing`),
};

/**
 * Reads the player's live events until the stream ends (its token expired,
 * the client fell behind, the connection broke) or `signal` aborts. Throws a
 * ProblemError if the service refuses the stream.
 */
export async function read_social_events(on_event: (e: SocialEvent) => void, signal: AbortSignal): Promise<void> {
  const res = await authorized_fetch(url('/v1/events'), { signal, cache: 'no-store', headers: { accept: 'text/event-stream' } });
  if (!res.ok || !res.body) {
    await read_json(res);
    throw new ProblemError({ status: res.status, code: 'http_error', detail: 'the event stream is closed' });
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    let end: number;
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let type = '';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) type = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (type && data) on_event({ type, data: JSON.parse(data) } as SocialEvent);
    }
  }
}
