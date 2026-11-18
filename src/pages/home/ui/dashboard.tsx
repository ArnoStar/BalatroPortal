import { DeckGlyph, deck_name, phase_name, stake_name } from '@/entities/catalog';
import { game_api, items_api, type RunSummary } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { format_number, format_percent, time_ago, time_left, use_async } from '@/shared/lib';
import { AnchorButton, Coins, CountUp, Icon, LinkButton, Panel } from '@/shared/ui';
import { t } from '@/shared/i18n';
import { RunsList } from './runs-list';

/** For a signed-in player: the run to continue, their runs, their numbers, this week's items. */
export function Dashboard() {
  const runs = use_async(() => game_api.runs(20), []);
  const latest = runs.data?.find((r) => r.phase !== 'game_over');
  return (
    <div className="dash">
      <div className="stack">
        {latest ? <Continue run={latest} /> : null}
        <RunsList runs={runs} />
      </div>
      <div className="stack">
        <Numbers />
        <ThisWeek />
      </div>
    </div>
  );
}

/** the latest unfinished run: the game's Continue opens it */
function Continue({ run }: { run: RunSummary }) {
  return (
    <section className="continue" aria-labelledby="continue-title">
      <div className="continue__glow" aria-hidden />
      <div className="continue__head">
        <DeckGlyph deck={run.settings.deck} size="lg" />
        <div>
          <p className="eyebrow">
            <span className="hero__dot" aria-hidden /> {t('Your run is waiting')}
          </p>
          <h2 id="continue-title" className="continue__title">
            {deck_name(run.settings.deck)}
          </h2>
          <p className="continue__sub">
            <span className={`stake stake--${run.settings.stake}`}>{stake_name(run.settings.stake)}</span>
            <span>{phase_name(run.phase)}</span>
            <span className="muted">{time_ago(run.updated_at)}</span>
          </p>
        </div>
      </div>
      <dl className="continue__stats">
        <div>
          <dt>{t('Ante')}</dt>
          <dd>{run.ante}</dd>
        </div>
        <div>
          <dt>{t('Round')}</dt>
          <dd>{run.round}</dd>
        </div>
        <div>
          <dt>{t('Money')}</dt>
          <dd className="money">${run.dollars}</dd>
        </div>
        {run.best_hand ? (
          <div>
            <dt>{t('Best hand')}</dt>
            <dd>{format_number(run.best_hand)}</dd>
          </div>
        ) : null}
      </dl>
      <AnchorButton size="lg" className="btn--play continue__go" href={`${GAME_URL}/`} icon={<Icon name="play" />}>
        {t('Continue')}
      </AnchorButton>
    </section>
  );
}

function Numbers() {
  const { data } = use_async(() => game_api.player_stats(), []);
  if (!data?.runs.counted) return null;
  const finished = data.runs.won + data.runs.lost;
  const h = data.high_scores;
  return (
    <Panel
      title={t('Your numbers')}
      icon="chart"
      actions={
        <LinkButton to="/stats" tone="ghost" size="sm" viewTransition>
          {t('All stats')} <Icon name="arrow-right" />
        </LinkButton>
      }
    >
      <dl className="mini-stats">
        <div>
          <dt>{t('Runs')}</dt>
          <dd>
            <CountUp value={data.runs.counted} />
          </dd>
        </div>
        <div>
          <dt>{t('Win rate')}</dt>
          <dd>{format_percent(data.runs.won, finished)}</dd>
        </div>
        <div>
          <dt>{t('Best hand')}</dt>
          <dd>{typeof h.best_hand === 'number' ? <CountUp value={h.best_hand} /> : format_number(h.best_hand)}</dd>
        </div>
        <div>
          <dt>{t('Highest ante')}</dt>
          <dd>
            <CountUp value={h.highest_ante} />
          </dd>
        </div>
      </dl>
    </Panel>
  );
}

function ThisWeek() {
  const { data } = use_async(() => items_api.me().catch(() => null), []);
  if (!data) return null;
  const w = data.week;
  return (
    <Panel
      title={t('This week’s coins')}
      icon="coins"
      actions={
        <LinkButton to="/shop" tone="ghost" size="sm" viewTransition>
          <Coins value={data.coins} size="sm" /> <Icon name="arrow-right" />
        </LinkButton>
      }
    >
      <ul className="week-list">
        <li className={w.weekly_earned ? 'is-done' : undefined}>
          <Icon name={w.weekly_earned ? 'check-circle' : 'target'} />
          <span>
            <strong>
              {t('This week’s run')} <Coins value={w.weekly_coins} size="sm" />
            </strong>
            <small>{w.weekly_earned ? t('Earned') : t('Finish a run at ante 3 or later')}</small>
          </span>
        </li>
        <li className={w.weekly_win_earned ? 'is-done' : undefined}>
          <Icon name={w.weekly_win_earned ? 'check-circle' : 'trophy'} />
          <span>
            <strong>
              {t('This week’s win')} <Coins value={w.weekly_win_coins} size="sm" />
            </strong>
            <small>{w.weekly_win_earned ? t('Earned') : t('Win a run')}</small>
          </span>
        </li>
      </ul>
      <p className="muted week-next">
        <Icon name="clock" /> {t('New week in {time}', { time: time_left(Date.parse(w.next_week_at) - Date.now()) })}
      </p>
    </Panel>
  );
}
