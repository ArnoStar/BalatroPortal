import { useState, type CSSProperties } from 'react';

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

/**
 * A player's profile picture (`src`), or their initials on their own gradient
 * (also while the picture loads, or if it can't). Decorative: the name is
 * always written next to it.
 */
export function Avatar({ name, seed, src, size = 'md', className }: {
  name: string | null | undefined; seed?: string | null; src?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string;
}) {
  const n = name ?? 'A player';
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span className={['avatar', `avatar--${size}`, className].filter(Boolean).join(' ')} style={{ '--h': hue_of(seed ?? n) } as CSSProperties} aria-hidden>
      {initials(n)}
      {src && failed !== src ? (
        <img className="avatar__img" src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(src)} />
      ) : null}
    </span>
  );
}
