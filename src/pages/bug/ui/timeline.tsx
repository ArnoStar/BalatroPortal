import { useMemo, useState } from 'react';
import type { RecordedEvent } from '@/shared/api';
import { N_, t } from '@/shared/i18n';

const KINDS = [
  ['action', N_('Actions')], ['api', N_('API calls')], ['state', N_('States')], ['run', N_('Runs opened')], ['log', N_('Logs')], ['input', N_('Inputs')],
] as const;

/** one line for an event of the game's recording */
function summary(e: RecordedEvent): string {
  switch (e.k) {
    case 'api': {
      const req = e.req && typeof e.req === 'object' ? (e.req as Record<string, unknown>) : null;
      const what = req?.type ? ` ${String(req.type)}` : '';
      return `${e.method} ${e.path}${what} → ${e.status} in ${e.ms} ms${e.rid ? ` [${e.rid}]` : ''}`;
    }
    case 'action':
      return `${e.phase} ${e.type}${e.version !== undefined ? ` (version ${e.version})` : ''}${e.error ? `: ${e.error}` : ''}`;
    case 'input':
      return e.type === 'key' || e.type === 'keyup' ? `${e.type} ${e.key}` : `${e.type}${e.button ? ` (button ${e.button})` : ''} at ${e.x}, ${e.y}`;
    case 'state':
      return `${e.stage} · ${e.state}`;
    case 'run':
      return `opened run ${String(e.id).slice(0, 8)} at version ${e.version}`;
    case 'log':
      return `${e.level}: ${e.message}`;
    default:
      return JSON.stringify(e);
  }
}

/** The recording, newest last, with times counted back from the report. */
export function Timeline({ events, end }: { events: RecordedEvent[]; end: number }) {
  const [shown, setShown] = useState<Set<string>>(new Set(['action', 'api', 'state', 'run', 'log']));
  const [limit, setLimit] = useState(300);
  const kept = useMemo(() => events.filter((e) => shown.has(e.k)), [events, shown]);
  const visible = kept.slice(-limit);
  const toggle = (k: string) => {
    const next = new Set(shown);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setShown(next);
  };
  return (
    <div className="stack">
      <div className="filters" role="group" aria-label={t('Kinds of events')}>
        {KINDS.map(([k, label]) => (
          <button key={k} type="button" className={`chip-toggle chip-toggle--${k}`} aria-pressed={shown.has(k)} onClick={() => toggle(k)}>
            <span className="chip-toggle__dot" aria-hidden />
            {t(label)} <span className="muted">{events.filter((e) => e.k === k).length}</span>
          </button>
        ))}
      </div>
      {kept.length > visible.length ? (
        <button type="button" className="btn btn--grey btn--small" onClick={() => setLimit(limit + 500)}>
          {t('Show {n} earlier events', { n: Math.min(500, kept.length - visible.length) })}
        </button>
      ) : null}
      <ol className="timeline">
        {visible.map((e, i) => (
          <li key={i} className={`timeline__row timeline__row--${e.k}${e.k === 'log' && e.level === 'error' ? ' timeline__row--error' : ''}`}>
            <span className="timeline__t">{(e.t - end).toFixed(2)}s</span>
            <span className="timeline__k">{e.k}</span>
            <details className="timeline__body">
              <summary>{summary(e)}</summary>
              <pre>{JSON.stringify(e, null, 2)}</pre>
            </details>
          </li>
        ))}
      </ol>
    </div>
  );
}
