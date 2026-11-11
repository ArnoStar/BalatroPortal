import { useLayoutEffect, useRef, type ReactNode } from 'react';

/** an option: its value, its text, and (optional) the glider's colour when it is chosen */
export type SegmentedOption<T> = readonly [T, ReactNode] | readonly [T, ReactNode, string];

/** one choice among a few, as pressed buttons; a glider slides to the chosen one */
export function Segmented<T extends string | number>({ value, options, onChange, label, className }: {
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  /** what is chosen (for screen readers) */
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chosen = options.find((o) => o[0] === value);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const place = () => {
      const on = el.querySelector<HTMLElement>('.segmented__item[aria-pressed="true"]');
      el.style.setProperty('--glide-x', `${on?.offsetLeft ?? 0}px`);
      el.style.setProperty('--glide-y', `${on?.offsetTop ?? 0}px`);
      el.style.setProperty('--glide-w', `${on?.offsetWidth ?? 0}px`);
      el.style.setProperty('--glide-h', `${on?.offsetHeight ?? 0}px`);
    };
    place();
    // (it slides from the next change on, not from nowhere on the first paint)
    const ready = requestAnimationFrame(() => {
      el.dataset.ready = '';
    });
    const watch = new ResizeObserver(place);
    watch.observe(el);
    return () => {
      cancelAnimationFrame(ready);
      watch.disconnect();
    };
  }, [value, options.length]);

  return (
    <div
      ref={ref}
      className={['segmented', 'segmented--glide', className].filter(Boolean).join(' ')}
      role="group"
      aria-label={label}
      data-tone={chosen?.[2]}
    >
      <span className="segmented__glider" aria-hidden />
      {options.map(([v, text]) => (
        <button key={String(v)} type="button" className="segmented__item" aria-pressed={v === value} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}
