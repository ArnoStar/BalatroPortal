// Movement that follows the player: numbers that count up into view, and
// surfaces that tilt toward the pointer. Both stand still with reduced motion.
import { useEffect, useRef, useState } from 'react';
import { format_number } from '@/shared/lib';

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** `value`, counted up from zero the first time it comes into view (and from the
 *  last value when it changes). Screen readers get the final number only. */
export function CountUp({ value, format = format_number, duration = 1100 }: {
  value: number; format?: (n: number) => string; duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const still = useRef(reduced() || !Number.isFinite(value) || Math.abs(value) >= 1e11);
  const [shown, setShown] = useState(still.current ? value : 0);
  const from = useRef(shown);

  useEffect(() => {
    if (reduced() || !Number.isFinite(value) || Math.abs(value) >= 1e11) {
      from.current = value;
      setShown(value);
      return;
    }
    let frame = 0;
    const run = () => {
      const start = performance.now();
      const a = from.current;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const v = a + (value - a) * (1 - (1 - t) ** 4);
        from.current = v;
        setShown(t < 1 ? v : value);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) {
      run();
      return () => cancelAnimationFrame(frame);
    }
    const seen = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        seen.disconnect();
        run();
      }
    });
    seen.observe(el);
    return () => {
      seen.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  const integer = Number.isInteger(value);
  return (
    <span className="count-up" ref={ref}>
      <span aria-hidden>{format(integer && shown !== value ? Math.round(shown) : shown)}</span>
      <span className="visually-hidden">{format(value)}</span>
    </span>
  );
}

/** a ref for an element that tilts toward the pointer (CSS: --rx, --ry, and --px, --py
 *  for a glare); only with a fine pointer and without reduced motion */
export function useTilt<T extends HTMLElement>(max = 10) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--rx', `${((0.5 - y) * max).toFixed(2)}deg`);
        el.style.setProperty('--ry', `${((x - 0.5) * max).toFixed(2)}deg`);
        el.style.setProperty('--px', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--py', `${(y * 100).toFixed(1)}%`);
        el.dataset.tilt = 'on';
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      delete el.dataset.tilt;
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [max]);
  return ref;
}
