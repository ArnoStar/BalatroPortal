// How the social service's things read, in the player's language: a friend's
// activity and presence, a conversation's name, a system message, a message in
// a list. (Names never take a gendered verb: other languages have them.)
import type { Activity, ChatMessage, Conversation, Presence, SystemNote } from '@/shared/api';
import { t } from '@/shared/i18n';

interface Names {
  deck: (key: string) => string;
  stake: (stake: number) => string;
}

/** "Playing Red Deck, White Stake · Ante 3", "In the menu" */
export function activity_text(a: Activity, names: Names): string {
  if (a.kind === 'menu') return t('In the game’s menu');
  if (a.kind === 'watching') return t('Watching a run');
  const what = a.challenge ? t('a challenge') : a.deck ? (a.stake ? `${names.deck(a.deck)}, ${names.stake(a.stake)}` : names.deck(a.deck)) : t('a run');
  return [t('Playing {what}', { what }), a.ante ? t('Ante {n}', { n: a.ante }) : null, a.seeded ? t('seeded') : null].filter(Boolean).join(' · ');
}

/** online and what they do, or when they were last seen */
export function presence_text(p: Presence | null, names: Names, ago: (iso: string) => string): string {
  if (!p) return '';
  if (p.online) return p.activity ? activity_text(p.activity, names) : t('Online');
  return p.last_seen ? t('Last seen {when}', { when: ago(p.last_seen) }) : t('Offline');
}

/** a group's title, or the other player's name */
export function conversation_title(c: Conversation, me: string | undefined): string {
  if (c.kind === 'group') return c.title ?? t('A group');
  return c.members.find((m) => m.id !== me)?.name ?? t('A player');
}

/** the other player of a direct conversation */
export const other_member = (c: Conversation, me: string | undefined) => (c.kind === 'direct' ? c.members.find((m) => m.id !== me) : undefined);

const who = (id: string | undefined, name: string | null | undefined, me: string | undefined) => (id === me ? t('You') : name ?? t('A player'));

/** "Ann made the group The Jimbos", "You added Bob and Cy" */
export function system_text(s: SystemNote, me: string | undefined): string {
  const by = who(s.by?.id, s.by?.name, me);
  const list = s.players.map((p) => who(p.id, p.name, me));
  const players = list.length > 1 ? t('{list} and {last}', { list: list.slice(0, -1).join(', '), last: list[list.length - 1] }) : list[0] ?? '';
  const you = s.by?.id === me;
  switch (s.event) {
    case 'created':
      return s.title ? (you ? t('You made the group “{title}”', { by, title: s.title }) : t('{by} made the group “{title}”', { by, title: s.title })) : (you ? t('You made the group', { by }) : t('{by} made the group', { by }));
    case 'renamed':
      return (you ? t('You renamed the group “{title}”', { by, title: s.title ?? '' }) : t('{by} renamed the group “{title}”', { by, title: s.title ?? '' }));
    case 'added':
      return (you ? t('You added {players}', { by, players }) : t('{by} added {players}', { by, players }));
    case 'removed':
      return (you ? t('You removed {players}', { by, players }) : t('{by} removed {players}', { by, players }));
    case 'left':
      return (you ? t('You left the group', { by }) : t('{by} left the group', { by }));
  }
}

/** a message in a list of conversations: "You: gg", "Bob shared a run" */
export function message_preview(m: ChatMessage, me: string | undefined, group: boolean): string {
  if (m.kind === 'system' && m.system) return system_text(m.system, me);
  if (m.deleted) return t('A deleted message');
  const mine = m.sender?.id === me;
  const by = mine ? t('You') : m.sender?.name ?? t('A player');
  if (m.kind === 'run') return m.text ? (mine ? t('You shared a run: {text}', { by, text: m.text }) : t('{by} shared a run: {text}', { by, text: m.text })) : (mine ? t('You shared a run', { by }) : t('{by} shared a run', { by }));
  if (m.kind === 'seed') return m.text ? (mine ? t('You shared a seed: {text}', { by, text: m.text }) : t('{by} shared a seed: {text}', { by, text: m.text })) : (mine ? t('You shared a seed', { by }) : t('{by} shared a seed', { by }));
  return mine || group ? `${by}: ${m.text}` : m.text;
}
