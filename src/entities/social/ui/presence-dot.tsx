import type { Presence } from '@/shared/api';

/** online (in the game: gold), or not: a dot on a friend's avatar (its meaning is written next to it) */
export function PresenceDot({ presence }: { presence: Presence | null | undefined }) {
  const state = presence?.online ? (presence.activity?.kind === 'run' ? 'playing' : 'online') : 'offline';
  return <span className={`presence-dot presence-dot--${state}`} aria-hidden />;
}
