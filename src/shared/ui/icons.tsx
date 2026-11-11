// The portal's icons: 24 x 24, drawn with a 2px stroke in the current colour
// (a few are filled). Decorative by default: give the control a label.
import type { ReactNode, SVGProps } from 'react';

const STROKED = {
  home: <path d="M3.5 10.5 12 3.5l8.5 7M5.5 9v10.5a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9" />,
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M17 6h2.5a2.5 2.5 0 0 1 0 5H17M7 6H4.5a2.5 2.5 0 0 0 0 5H7M12 14v3M8 21h8M9.5 17h5l.5 4H9z" />
    </>
  ),
  chart: <path d="M4 20h16M7 16v-5M12 16V5M17 16V9" />,
  user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 21a7.5 7.5 0 0 1 15 0" />,
  users: <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />,
  cards: (
    <>
      <rect x="3.5" y="7" width="11" height="14" rx="2" />
      <path d="M8 4.5 8.6 4a2 2 0 0 1 2.4-.4l8.1 4.3a2 2 0 0 1 .8 2.7l-4.4 8.3" />
    </>
  ),
  swap: <path d="M4 8h15l-4-4M20 16H5l4 4" />,
  dice: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M8.5 8.5h.01M15.5 15.5h.01M12 12h.01M15.5 8.5h.01M8.5 15.5h.01" strokeWidth="2.6" />
    </>
  ),
  bug: (
    <path d="M9 7.5V6a3 3 0 0 1 6 0v1.5M8 9h8a1 1 0 0 1 1 1v4a5 5 0 0 1-10 0v-4a1 1 0 0 1 1-1zM12 12v7M3.5 13H7M17 13h3.5M4.5 8.5 7 10M19.5 8.5 17 10M4.5 19l2.8-2M19.5 19l-2.8-2" />
  ),
  shield: <path d="M12 3.5 19.5 6v5.5c0 4.4-3.1 8-7.5 9-4.4-1-7.5-4.6-7.5-9V6zM9 12l2 2 4-4" />,
  settings: (
    <>
      <path d="M4 7h9M18 7h2M4 17h2M11 17h9" />
      <circle cx="15.5" cy="7" r="2.5" />
      <circle cx="8.5" cy="17" r="2.5" />
    </>
  ),
  logout: <path d="M14.5 4H18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3.5M10 16.5 5.5 12 10 7.5M5.5 12H16" />,
  login: <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9.5 16.5 14 12 9.5 7.5M14 12H3.5" />,
  'user-plus': <path d="M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21a7 7 0 0 1 12.5-4.3M19 14v6M16 17h6" />,
  search: <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />,
  menu: <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  'chevron-right': <path d="m9.5 6 6 6-6 6" />,
  'chevron-left': <path d="m14.5 6-6 6 6 6" />,
  'chevron-down': <path d="m6 9.5 6 6 6-6" />,
  'arrow-right': <path d="M4.5 12h15M13.5 6l6 6-6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  'check-circle': <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM8.5 12.5l2.5 2.5 4.5-5" />,
  'x-circle': <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM9 9l6 6M15 9l-6 6" />,
  alert: <path d="M12 4 21 19.5H3zM12 10v4M12 16.8h.01" />,
  info: <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 11v5M12 7.8h.01" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  trash: <path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13M10 11v5M14 11v5" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 8.5V6a2 2 0 0 0-2-2h-7.5a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" />
    </>
  ),
  refresh: <path d="M20 11.5A8 8 0 1 0 17.7 17M20 4.5V11h-6.5" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  clock: <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 7v5l3.5 2" />,
  history: <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4v5h5M12 8v4l3 2" />,
  coins: (
    <>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M15.6 9.6a5.5 5.5 0 1 1-6 6M8 7.5h2v3.5" />
    </>
  ),
  gift: <path d="M4 11h16v9.5H4zM3 7.5h18V11H3zM12 7.5v13M12 7.5c-1-3-5.5-4.2-5.5-1.6 0 1.7 3.2 1.6 5.5 1.6zm0 0c1-3 5.5-4.2 5.5-1.6 0 1.7-3.2 1.6-5.5 1.6z" />,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  mail: <path d="M4 5.5h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1zM3.5 7l8.5 6 8.5-6" />,
  key: <path d="M8 19a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM10.8 12.2 19.5 3.5M16.5 6.5l2.5 2.5M14.5 8.5l2 2" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 12h.01" strokeWidth="3" />
    </>
  ),
  layers: <path d="M12 3.5 21 8.5l-9 5-9-5zM3 12.5l9 5 9-5M3 16.5l9 5 9-5" />,
  hash: <path d="M5 9h14M5 15h14M10.5 4 8.5 20M15.5 4l-2 16" />,
  percent: (
    <>
      <path d="M19 5 5 19" />
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="17" cy="17" r="2.5" />
    </>
  ),
  gem: <path d="M6.5 3.5h11L21.5 9 12 20.5 2.5 9zM2.5 9h19M12 20.5 8.5 9l2-5.5M12 20.5 15.5 9l-2-5.5" />,
  command: <path d="M9 9V6.5A2.5 2.5 0 1 0 6.5 9H9zm0 0h6m-6 0v6m6-6V6.5A2.5 2.5 0 1 1 17.5 9H15zm0 0v6m0 0h-6m6 0v2.5a2.5 2.5 0 1 0 2.5-2.5H15zm-6 0H6.5A2.5 2.5 0 1 0 9 17.5V15z" />,
  flame: <path d="M12 3c1 3.6 5.5 5.4 5.5 10.5a5.5 5.5 0 0 1-11 0c0-2.6 1.4-4.2 2.6-5.3.4 2 1.6 3.1 2.9 3.1-1.2-3-.8-6 0-8.3z" />,
  zap: <path d="M13 2.5 4.5 14H11l-1 7.5L19.5 10H13z" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  wand: <path d="M4 20 15 9M14 4v2M19 9h-2M17.5 5.5 16 7M9 4.5l.5 1.5L11 6.5l-1.5.5L9 8.5 8.5 7 7 6.5 8.5 6zM18.5 13l.4 1.1 1.1.4-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4z" />,
  sparkles: <path d="M10 4.5c.6 3.4 2.4 5.2 5.8 5.8-3.4.6-5.2 2.4-5.8 5.8-.6-3.4-2.4-5.2-5.8-5.8 3.4-.6 5.2-2.4 5.8-5.8zM18 14.5c.3 1.6 1.1 2.4 2.7 2.7-1.6.3-2.4 1.1-2.7 2.7-.3-1.6-1.1-2.4-2.7-2.7 1.6-.3 2.4-1.1 2.7-2.7z" />,
  medal: <path d="M8.5 3.5h7L13.6 8M10.4 8 8.5 3.5M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 12.5v5M10.5 14l1.5-1.5" />,
  crown: <path d="m3 8.5 4.5 4L12 5l4.5 7.5L21 8.5l-2 10.5H5zM5.5 21.5h13" />,
  scale: <path d="M12 4v16M7 20h10M5 7.5h14M5 7.5 2.5 13a3 3 0 0 0 5 0zM19 7.5 16.5 13a3 3 0 0 0 5 0zM12 4.5l-2 3M12 4.5l2 3" />,
  note: <path d="M5 4h10l4 4v12H5zM14.5 4v4.5H19M8.5 12h7M8.5 16h5" />,
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M3.5 16 9 11l4.5 4 2.5-2 4.5 4M15.5 9h.01" />
    </>
  ),
  pulse: <path d="M3 12h4l2.5-6 5 12 2.5-6h4" />,
} satisfies Record<string, ReactNode>;

const FILLED = {
  play: <path d="M8 4.8v14.4a1 1 0 0 0 1.5.86l11.6-7.2a1 1 0 0 0 0-1.72L9.5 3.94A1 1 0 0 0 8 4.8z" />,
  spade: <path d="M12 2.5c-2.8 3.9-7.5 6.4-7.5 10.6a4 4 0 0 0 6.6 3.1L9.6 20.5h4.8l-1.5-4.3a4 4 0 0 0 6.6-3.1c0-4.2-4.7-6.7-7.5-10.6z" />,
  heart: <path d="M12 20.5s-8.5-5.3-8.5-11.2a4.6 4.6 0 0 1 8.5-2.5 4.6 4.6 0 0 1 8.5 2.5c0 5.9-8.5 11.2-8.5 11.2z" />,
  diamond: <path d="M12 2.5 19 12l-7 9.5L5 12z" />,
  club: (
    <path d="M12 2.8a3.9 3.9 0 0 0-3.5 5.6 3.9 3.9 0 1 0 1.9 6.9L9.6 20.5h4.8l-.8-5.2a3.9 3.9 0 1 0 1.9-6.9A3.9 3.9 0 0 0 12 2.8z" />
  ),
  star: <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" />,
  sparkle: <path d="M12 2.5c.7 5 3.5 7.8 8.5 8.5-5 .7-7.8 3.5-8.5 8.5-.7-5-3.5-7.8-8.5-8.5 5-.7 7.8-3.5 8.5-8.5z" />,
  dot: <circle cx="12" cy="12" r="4.5" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof STROKED | keyof typeof FILLED;

/** an icon by name; `label` makes it an image for screen readers (otherwise hidden from them) */
export function Icon({ name, label, className, ...rest }: { name: IconName; label?: string } & SVGProps<SVGSVGElement>) {
  const filled = name in FILLED;
  const shape = filled ? FILLED[name as keyof typeof FILLED] : STROKED[name as keyof typeof STROKED];
  return (
    <svg
      viewBox="0 0 24 24"
      className={['icon', className].filter(Boolean).join(' ')}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {shape}
    </svg>
  );
}
