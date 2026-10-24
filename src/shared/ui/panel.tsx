import type { ReactNode } from 'react';

export function Panel({ title, children, narrow = false }: { title?: ReactNode; children: ReactNode; narrow?: boolean }) {
  return (
    <section className={narrow ? 'panel panel--narrow' : 'panel'}>
      {title ? <h2 className="panel__title">{title}</h2> : null}
      {children}
    </section>
  );
}

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'info' | 'success'; children: ReactNode }) {
  return (
    <p className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <p className="loading" role="status">
      <span className="spinner" aria-hidden /> {label}…
    </p>
  );
}

export function Divider({ children }: { children?: ReactNode }) {
  return <div className="divider">{children}</div>;
}
