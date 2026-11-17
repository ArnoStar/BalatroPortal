import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { avatar_url, avatar_versions } from '@/shared/api';
import { t } from '@/shared/i18n';

/** a hue for a name or id: the same player always gets the same colours */
export function hue_of(s: string): number {
  let h = 7;
  for (const c of s) h = (Math.imul(h, 31) + (c.codePointAt(0) ?? 0)) >>> 0;
  return h % 360;
}

/** "Lucky Seven" → "LS", "naneinf_hunter" → "N" */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => [...w][0] ?? '').join('').toUpperCase() || '?';
}

/** a player's profile picture (null: none, or not known yet), looked up with the others on the page */
function usePicture(player: string | null | undefined): string | null {
  const version = useSyncExternalStore(avatar_versions.subscribe, () => (player ? avatar_versions.peek(player) : null));
  useEffect(() => {
    if (player) avatar_versions.want(player);
  }, [player]);
  return player ? avatar_url(player, version) : null;
}

/**
 * A player's profile picture, or their initials on their own gradient (also
 * while the picture loads, or if it can't). `player`: their account id, whose
 * picture is looked up (the social service's); `src`: a picture already known.
 * Decorative: the name is always written next to it.
 */
export function Avatar({ name, seed, player, src, size = 'md', className }: {
  name: string | null | undefined;
  seed?: string | null;
  player?: string | null;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const n = name ?? t('A player');
  const looked_up = usePicture(src === undefined ? player : null);
  const picture = src ?? looked_up;
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span className={['avatar', `avatar--${size}`, className].filter(Boolean).join(' ')} style={{ '--h': hue_of(seed ?? player ?? n) } as CSSProperties} aria-hidden>
      {initials(n)}
      {picture && failed !== picture ? (
        <img className="avatar__img" src={picture} alt="" loading="lazy" decoding="async" onError={() => setFailed(picture)} />
      ) : null}
    </span>
  );
}
