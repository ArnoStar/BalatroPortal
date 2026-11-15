// How the social service's things read: a friend's activity and presence, a
// conversation's name, a system message, a message in a list.
import type { Activity, ChatMessage, Conversation, Presence, SystemNote } from '@/shared/api';

interface Names {
  deck: (key: string) => string;
  stake: (stake: number) => string;
}

/** "Playing Red Deck, White Stake · Ante 3", "In the menu" */
export function activity_text(a: Activity, names: Names): string {
  if (a.kind === 'menu') return 'In the game’s menu';
  if (a.kind === 'watching') return 'Watching a run';
  const what = a.challenge ? 'a challenge' : `${a.deck ? names.deck(a.deck) : 'a run'}${a.stake ? `, ${names.stake(a.stake)}` : ''}`;
  return `Playing ${what}${a.ante ? ` · Ante ${a.ante}` : ''}${a.seeded ? ' · seeded' : ''}`;
}

/** online and what they do, or when they were last seen */
export function presence_text(p: Presence | null, names: Names, ago: (iso: string) => string): string {
  if (!p) return '';
  if (p.online) return p.activity ? activity_text(p.activity, names) : 'Online';
  return p.last_seen ? `Last seen ${ago(p.last_seen)}` : 'Offline';
}

/** a group's title, or the other player's name */
export function conversation_title(c: Conversation, me: string | undefined): string {
  if (c.kind === 'group') return c.title ?? 'A group';
  return c.members.find((m) => m.id !== me)?.name ?? 'A player';
}

/** the other player of a direct conversation */
export const other_member = (c: Conversation, me: string | undefined) => (c.kind === 'direct' ? c.members.find((m) => m.id !== me) : undefined);

const who = (id: string | undefined, name: string | null | undefined, me: string | undefined) => (id === me ? 'You' : name ?? 'A player');

/** "Ann made the group The Jimbos", "You added Bob and Cy" */
export function system_text(s: SystemNote, me: string | undefined): string {
  const by = who(s.by?.id, s.by?.name, me);
  const list = s.players.map((p) => who(p.id, p.name, me).replace(/^You$/, 'you'));
  const players = list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0] ?? '';
  switch (s.event) {
    case 'created': return `${by} made the group${s.title ? ` “${s.title}”` : ''}`;
    case 'renamed': return `${by} renamed the group “${s.title ?? ''}”`;
    case 'added': return `${by} added ${players}`;
    case 'removed': return `${by} removed ${players}`;
    case 'left': return `${by} left the group`;
  }
}

/** a message in a list of conversations: "You: gg", "Bob shared a run" */
export function message_preview(m: ChatMessage, me: string | undefined, group: boolean): string {
  if (m.kind === 'system' && m.system) return system_text(m.system, me);
  if (m.deleted) return 'A deleted message';
  const by = m.sender?.id === me ? 'You' : m.sender?.name ?? 'A player';
  const what = m.kind === 'run' ? 'shared a run' : m.kind === 'seed' ? 'shared a seed' : null;
  if (what) return `${by} ${what}${m.text ? `: ${m.text}` : ''}`;
  return m.sender?.id === me || group ? `${by}: ${m.text}` : m.text;
}
