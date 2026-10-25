// Small, dependency-free charts in the portal's style: one hue (the game's
// blue) per chart, thin marks with rounded data ends, values at the bar tips,
// tooltips on hover and keyboard focus, and a table view for every chart.
import type { ReactNode } from 'react';

/** "1 run", "3 runs" */
export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
import { format_compact } from '@/shared/lib';

/** a headline number */
export function StatTile({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="stat-tile">
      <span className="stat-tile__label">{label}</span>
      <strong className="stat-tile__value">{value}</strong>
      {hint ? <span className="stat-tile__hint">{hint}</span> : null}
    </div>
  );
}

export interface Bar {
  key: string;
  label: ReactNode;
  value: number;
  /** the value as written at the bar's tip (default: the number) */
  text?: ReactNode;
  /** more about the bar, under it (win rate ...) */
  detail?: ReactNode;
}

/** horizontal bars, largest first as given: magnitude by length */
export function BarList({ bars, empty = 'Nothing yet.' }: { bars: Bar[]; empty?: ReactNode }) {
  if (!bars.length) return <p className="muted">{empty}</p>;
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <ul className="bar-list">
      {bars.map((b) => (
        <li key={b.key} className="bar-list__row">
          <span className="bar-list__label">{b.label}</span>
          <span className="bar-list__track">
            {/* (the bar shares its row with the value at its tip: 6rem kept for it) */}
            <span className="bar-list__bar" style={{ width: `calc((100% - 6rem) * ${Math.max(b.value / max, 0.005)})` }} />
            <span className="bar-list__value">{b.text ?? b.value.toLocaleString('en-US')}</span>
          </span>
          {b.detail ? <span className="bar-list__detail">{b.detail}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export interface Column {
  key: string;
  /** the x position's name (a date ...) */
  label: string;
  value: number;
  /** what the tooltip and the table add (wins ...) */
  detail?: string;
}

/** columns over time (one series): each column has its tooltip; first, middle and last are labelled */
export function ColumnChart({ columns, caption, unit }: { columns: Column[]; caption: string; unit: string }) {
  const max = Math.max(...columns.map((c) => c.value), 1);
  const ticks = new Set([0, Math.floor(columns.length / 2), columns.length - 1]);
  return (
    <figure className="columns">
      <div className="columns__plot" role="img" aria-label={caption}>
        <span className="columns__tick columns__tick--top">{format_compact(max)}</span>
        <span className="columns__tick columns__tick--zero">0</span>
        {columns.map((c, i) => (
          <span key={c.key} className="columns__slot" tabIndex={0} aria-label={`${c.label}: ${c.value} ${unit}${c.detail ? `, ${c.detail}` : ''}`}>
            <span className="columns__bar" style={{ height: `${(100 * c.value) / max}%` }} />
            <span className="columns__tip" role="tooltip">
              <strong>
                {c.value} {unit}
              </strong>
              <span>{c.label}</span>
              {c.detail ? <span>{c.detail}</span> : null}
            </span>
            {ticks.has(i) ? <span className="columns__x">{c.label}</span> : null}
          </span>
        ))}
      </div>
      <figcaption className="muted">{caption}</figcaption>
      <details className="columns__table">
        <summary>Show as a table</summary>
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col" className="num">
                {unit[0]?.toUpperCase() + unit.slice(1)}
              </th>
              <th scope="col">Detail</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((c) => (
              <tr key={c.key}>
                <td>{c.label}</td>
                <td className="num">{c.value}</td>
                <td>{c.detail ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
