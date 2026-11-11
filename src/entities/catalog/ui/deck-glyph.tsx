// A deck as a small card back in its own colours (the portal's drawing, not the
// game's art). Decorative: the deck's name is always written next to it.
import type { CSSProperties } from 'react';

const LOOKS: Record<string, [string, string]> = {
  b_red: ['#ff6b85', '#a3123a'],
  b_blue: ['#5aa8ff', '#1d4fb8'],
  b_yellow: ['#ffd65e', '#c48a00'],
  b_green: ['#45e3a0', '#11895a'],
  b_black: ['#5a5470', '#16131f'],
  b_magic: ['#c08cff', '#5a2bb5'],
  b_nebula: ['#7a8bff', '#2a1b6b'],
  b_ghost: ['#d2f6ff', '#4d8fa8'],
  b_abandoned: ['#d2c2a4', '#5e5243'],
  b_checkered: ['#ff6b85', '#1d1930'],
  b_zodiac: ['#8a6cff', '#ffc53d'],
  b_painted: ['#ff9cbd', '#55c9e0'],
  b_anaglyph: ['#ff3b5c', '#3fd5ff'],
  b_plasma: ['#ff5fdc', '#4c3dff'],
  b_erratic: ['#ffc53d', '#3fd5ff'],
  b_challenge: ['#a49ec2', '#3a3452'],
};

export function DeckGlyph({ deck, size = 'md' }: { deck: string; size?: 'sm' | 'md' | 'lg' }) {
  const [a, b] = LOOKS[deck] ?? LOOKS.b_challenge;
  return <span className={`deck-glyph deck-glyph--${size} deck-glyph--${deck}`} style={{ '--d1': a, '--d2': b } as CSSProperties} aria-hidden />;
}
