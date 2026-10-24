import type { ReactNode } from 'react';
import type { RunSummary } from '@/shared/api';
import { deck_name, phase_name, stake_name } from '../lib/names';

const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function RunCard({ run, actions }: { run: RunSummary; actions?: ReactNode }) {
  const over = run.phase === 'game_over';
  const status = over ? (run.won ? 'Won' : 'Lost') : phase_name(run.phase);
  return (
    <li className={`run-card${over ? ' run-card--over' : ''}`}>
      <div className="run-card__main">
        <strong>{deck_name(run.settings.deck)}</strong>
        <span className={`stake stake--${run.settings.stake}`}>{stake_name(run.settings.stake)}</span>
        {run.settings.challenge ? <span className="tag">Challenge</span> : null}
      </div>
      <div className="run-card__stats">
        <span>Ante {run.ante}</span>
        <span>Round {run.round}</span>
        <span className="money">${run.dollars}</span>
        <span className={over ? (run.won ? 'win' : 'loss') : undefined}>{status}</span>
      </div>
      <div className="run-card__meta">
        <span title="seed">Seed {run.settings.seed}</span>
        <time dateTime={run.updated_at}>{when.format(new Date(run.updated_at))}</time>
        {actions}
      </div>
    </li>
  );
}
