// The moment a game is drawn: a modal stage over the page, and confetti when
// the player wins.
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Button } from '@/shared/ui';

const CONFETTI = ['#ffc53d', '#4c9dff', '#ff5c7a', '#2fe0a0', '#9b7bff', '#ff9f43'];

/** falling pieces of colour (decoration; nothing with reduced motion) */
export function Confetti() {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 36 }, (_, i) => (
        <i
          key={i}
          style={
            {
              '--x': `${(i * 37) % 100}%`,
              '--d': `${(i % 6) * 0.12}s`,
              '--t': `${2.2 + (i % 5) * 0.35}s`,
              '--r': `${(i * 53) % 360}deg`,
              '--c': CONFETTI[i % CONFETTI.length],
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** a modal over the page, open while it is shown; closing it calls onClose */
export function ResultStage({ title, tone, onClose, children }: {
  title: string; tone: 'win' | 'loss' | 'none'; onClose: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog ref={ref} className={`stage stage--${tone}`} aria-label={title} onClose={onClose}>
      <div className="stage__light" aria-hidden />
      <div className="stage__body">
        {children}
        <Button tone="grey" onClick={() => ref.current?.close()}>
          Close
        </Button>
      </div>
    </dialog>
  );
}
