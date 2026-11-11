import type { ReactNode } from 'react';
import { Icon, type IconName } from './icons';

/** a block of the page: a title (with an icon and actions on its right), then its content */
export function Panel({ title, icon, actions, narrow = false, tone, className, id, children }: {
  title?: ReactNode;
  icon?: IconName;
  actions?: ReactNode;
  narrow?: boolean;
  /** danger: the account's deletion; glow: what the page is about */
  tone?: 'danger' | 'glow';
  className?: string;
  id?: string;
  children: ReactNode;
}) {
  const cls = ['panel', narrow && 'panel--narrow', tone && `panel--${tone}`, className].filter(Boolean).join(' ');
  return (
    <section className={cls} id={id}>
      {title || actions ? (
        <header className="panel__head">
          {title ? (
            <h2 className="panel__title">
              {icon ? <Icon name={icon} className="panel__icon" /> : null}
              <span>{title}</span>
            </h2>
          ) : null}
          {actions ? <div className="panel__actions">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/** the top of a page: what it is (the eyebrow), its title, a line about it, and its main actions */
export function PageHeader({ eyebrow, title, lead, icon, actions, children }: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  icon?: IconName;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        {eyebrow ? (
          <p className="eyebrow">
            {icon ? <Icon name={icon} /> : null}
            {eyebrow}
          </p>
        ) : null}
        <h1 className="page-title">{title}</h1>
        {lead ? <p className="page-header__lead">{lead}</p> : null}
        {children}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}

const ALERT_ICONS: Record<'error' | 'info' | 'success', IconName> = { error: 'alert', info: 'info', success: 'check-circle' };

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'info' | 'success'; children: ReactNode }) {
  return (
    <p className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={ALERT_ICONS[tone]} className="alert__icon" />
      <span>{children}</span>
    </p>
  );
}

/** waiting for a service: three cards shuffling */
export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="loading__cards" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <span>{label}…</span>
    </div>
  );
}

export function Divider({ children }: { children?: ReactNode }) {
  return <div className="divider">{children}</div>;
}

/** nothing to show yet: what would be here, and how to get it */
export function EmptyState({ icon = 'sparkles', title, children, action }: {
  icon?: IconName; title: ReactNode; children?: ReactNode; action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty__icon" aria-hidden>
        <Icon name={icon} />
      </span>
      <p className="empty__title">{title}</p>
      {children ? <div className="empty__text">{children}</div> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}
