import type { ReactNode } from 'react';
import { CardFan, Icon, useTilt, type IconName } from '@/shared/ui';

/** The sign-in pages: the form on its card, beside a hand of cards and what an account keeps. */
export function AuthShell({ title, lead, icon, children }: { title: string; lead?: ReactNode; icon: IconName; children: ReactNode }) {
  const art = useTilt<HTMLDivElement>(10);
  return (
    <div className="auth">
      <div className="auth__art" ref={art}>
        <CardFan size="md" />
        <div className="auth__pitch">
          <p className="auth__motto">Same seed, same run.</p>
          <ul>
            <li>
              <Icon name="history" /> Your runs, kept and watchable
            </li>
            <li>
              <Icon name="trophy" /> A place on the leaderboards
            </li>
            <li>
              <Icon name="cards" /> Items found by playing
            </li>
          </ul>
        </div>
      </div>
      <section className="auth__card" aria-labelledby="auth-title">
        <header className="auth__head">
          <span className="auth__icon" aria-hidden>
            <Icon name={icon} />
          </span>
          <h1 className="auth__title" id="auth-title">
            {title}
          </h1>
          {lead ? <p className="auth__lead">{lead}</p> : null}
        </header>
        {children}
      </section>
    </div>
  );
}
