import type { ReactNode } from 'react';
import type { RunSummary } from '@/shared/api';
import { DeckGlyph, deck_name, phase_name, stake_name, useCatalogNames } from '@/entities/catalog';
import { GAME_URL } from '@/shared/config';
import { format_number, time_ago } from '@/shared/lib';
import { CopyText, Icon } from '@/shared/ui';

const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** won, lost, or still being played */
export const run_state = (run: RunSummary) => (run.phase === 'game_over' ? (run.won ? 'won' : 'lost') : 'live');

/** A run in a list. `watch`: a link to watch it again in the game (/play/?watch=<id>). */
export function RunCard({ run, actions, watch }: { run: RunSummary; actions?: ReactNode; watch?: boolean }) {
  const name = useCatalogNames();
  const state = run_state(run);
  const status = state === 'won' ? 'Won' : state === 'lost' ? 'Lost' : phase_name(run.phase);
  return (
    <li className={`run-card run-card--${state}`}>
      <DeckGlyph deck={run.settings.deck} />
      <div className="run-card__info">
        <div className="run-card__title">
          <strong>{deck_name(run.settings.deck)}</strong>
          <span className={`stake stake--${run.settings.stake}`}>{stake_name(run.settings.stake)}</span>
          {run.settings.challenge ? (
            <span className="tag" title="Challenge">
              <Icon name="flame" />
              {name(run.settings.challenge)}
            </span>
          ) : null}
          {run.settings.seeded ? <span className="tag">Seeded</span> : null}
          {run.counted === false ? (
            <span className="tag tag--muted" title="Runs with a chosen seed, challenges and runs with debug commands don't count for stats and leaderboards">
              Not in stats
            </span>
          ) : null}
        </div>
        <dl className="run-card__stats">
          <div>
            <dt>Ante</dt>
            <dd>{run.ante}</dd>
          </div>
          <div>
            <dt>Round</dt>
            <dd>{run.round}</dd>
          </div>
          <div>
            <dt>Money</dt>
            <dd className="money">${run.dollars}</dd>
          </div>
          {run.best_hand ? (
            <div>
              <dt>Best hand</dt>
              <dd>{format_number(run.best_hand)}</dd>
            </div>
          ) : null}
        </dl>
        <div className="run-card__meta">
          <CopyText text={run.settings.seed} label="Seed">
            Seed {run.settings.seed}
          </CopyText>
          <time dateTime={run.updated_at} title={when.format(new Date(run.updated_at))}>
            {time_ago(run.updated_at)}
          </time>
        </div>
      </div>
      <div className="run-card__side">
        <span className={`status status--${state}`}>
          <Icon name={state === 'won' ? 'check-circle' : state === 'lost' ? 'x-circle' : 'dot'} />
          {status}
        </span>
        {watch || actions ? (
          <div className="run-card__actions">
            {watch ? (
              <a className="btn btn--grey btn--sm" href={`${GAME_URL}/?watch=${encodeURIComponent(run.id)}`}>
                <Icon name="eye" />
                Watch
              </a>
            ) : null}
            {actions}
          </div>
        ) : null}
      </div>
    </li>
  );
}
