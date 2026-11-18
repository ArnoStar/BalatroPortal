// A card's wear, drawn over it from its condition (0 ruined ... 1 pristine):
// grime, specks, scratches, frayed edges and, once badly worn, a crease. Each
// item has its own (drawn from its id), in the card's pixels (71 x 95: the
// sheets' cell), as an SVG the card's shape clips. The colours fade and
// yellow too (the stylesheet's filter, from --wear).

/** a seeded random sequence (mulberry32) from a text */
function random_from(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 71;
const H = 95;
const cache = new Map<string, string>();

const n = (x: number) => Math.round(x * 10) / 10;

/** the wear's picture as a CSS url(), for a wear from 0 (none) to 1 (ruined); '' when there is nothing to draw */
export function wear_image(seed: string, wear: number): string {
  const w = Math.min(1, Math.max(0, Math.round(wear * 50) / 50));
  if (w < 0.04) return '';
  const key = `${seed}:${w}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = random_from(seed);
  const parts: string[] = [];
  // grime: soft brown blotches, more and darker the more worn
  const blotches = Math.round(1 + w * 7);
  for (let i = 0; i < blotches; i++) {
    const cx = n(r() * W), cy = n(r() * H), rx = n(4 + r() * 16 * (0.5 + w)), ry = n(4 + r() * 16 * (0.5 + w));
    parts.push(`<ellipse cx='${cx}' cy='${cy}' rx='${rx}' ry='${ry}' fill='%23452e18' opacity='${n(0.1 + 0.45 * w * r())}' filter='url(%23b)'/>`);
  }
  // specks of dirt
  const specks = Math.round(w * w * 60);
  for (let i = 0; i < specks; i++) {
    parts.push(`<rect x='${Math.floor(r() * W)}' y='${Math.floor(r() * H)}' width='1' height='1' fill='%23281a0c' opacity='${n(0.35 + 0.5 * r())}'/>`);
  }
  // scratches: short straight light lines
  const scratches = Math.round(w * 9 * (0.6 + 0.4 * r()));
  for (let i = 0; i < scratches; i++) {
    const x = r() * W, y = r() * H, a = r() * Math.PI * 2, len = 5 + r() * 26 * (0.4 + w);
    parts.push(`<line x1='${n(x)}' y1='${n(y)}' x2='${n(x + Math.cos(a) * len)}' y2='${n(y + Math.sin(a) * len)}' stroke='%23f4efe4' stroke-width='${n(0.45 + r() * 0.5)}' opacity='${n(0.35 + 0.5 * w)}'/>`);
  }
  // frayed edges: a broken light border, and rounded-off corners
  if (w > 0.15) {
    const dash = `${n(1 + r() * 4)} ${n(1 + r() * 6 * (1.2 - w))}`;
    parts.push(`<rect x='1' y='1' width='${W - 2}' height='${H - 2}' rx='4' fill='none' stroke='%23f2ede2' stroke-width='${n(1 + 1.6 * w)}' stroke-dasharray='${dash}' opacity='${n(0.25 + 0.6 * w)}'/>`);
  }
  // a crease across the card once it is badly worn
  if (w > 0.55) {
    const y1 = r() * H, y2 = r() * H;
    parts.push(`<line x1='0' y1='${n(y1)}' x2='${W}' y2='${n(y2)}' stroke='%23f7f2e8' stroke-width='0.8' opacity='${n(0.3 + 0.5 * w)}'/>`);
    parts.push(`<line x1='0' y1='${n(y1 + 1)}' x2='${W}' y2='${n(y2 + 1)}' stroke='%23321f0e' stroke-width='0.6' opacity='${n(0.25 + 0.3 * w)}'/>`);
  }
  // paper fibres all over
  const grain = `<rect width='${W}' height='${H}' filter='url(%23g)' opacity='${n(0.15 + 0.5 * w)}'/>`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' preserveAspectRatio='none'>`
    + `<filter id='b'><feGaussianBlur stdDeviation='${n(2 + 2 * w)}'/></filter>`
    + `<filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${Math.floor(r() * 999)}'/>`
    + `<feColorMatrix values='0 0 0 0 0.28 0 0 0 0 0.2 0 0 0 0 0.12 0 0 0 -1.6 1.1'/></filter>`
    + grain + parts.join('') + '</svg>';
  const url = `url("data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/"/g, "'").replace(/#/g, '%23')}")`;
  if (cache.size > 500) cache.clear();
  cache.set(key, url);
  return url;
}
