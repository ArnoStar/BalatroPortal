import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Timeline } from './timeline';
import { describe, reports_api, ProblemError, type Report } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { use_async } from '@/shared/lib';
import { Alert, AnchorButton, Avatar, Button, EmptyState, Icon, PageHeader, Panel, Spinner } from '@/shared/ui';
import { fmt_datetime, t } from '@/shared/i18n';


/** One bug report: what the player said and what the game recorded, and the way to see it again. */
export function BugPage() {
  const { id = '' } = useParams();
  const { data, error, loading } = use_async(() => reports_api.get(id), [id]);
  if (loading && !data) return <Spinner />;
  if (error instanceof ProblemError && error.code === 'not_admin') return <Alert>{t('Bug reports are for the developers.')}</Alert>;
  if (error) return <Alert>{describe(error)}</Alert>;
  if (!data) return null;
  return <Bug report={data} />;
}

function download(report: Report) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bug-report-${report.id}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function Bug({ report: initial }: { report: Report }) {
  const [report, setReport] = useState(initial);
  const [notes, setNotes] = useState(initial.notes);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    if (report.screenshot_url) {
      reports_api.screenshot(report.id).then(
        (u) => {
          url = u;
          setShot(u);
        },
        () => setShot(null),
      );
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [report.id, report.screenshot_url]);

  async function triage(change: { status?: 'open' | 'closed'; notes?: string }) {
    setBusy(true);
    setProblem(null);
    try {
      setReport(await reports_api.triage(report.id, change));
    } catch (err) {
      setProblem(describe(err));
    } finally {
      setBusy(false);
    }
  }

  const rec = report.recording;
  const events = rec.events ?? [];
  const errors = rec.errors ?? [];
  const end = rec.t ?? (events.length ? events[events.length - 1].t : 0);
  const span = events.length ? end - events[0].t : 0;
  const c = report.client;
  const history = report.history;
  const open = report.status === 'open';
  return (
    <div className="stack">
      <PageHeader
        eyebrow={
          <Link to="/bugs" className="back" viewTransition>
            <Icon name="chevron-left" /> {t('Bug reports')}
          </Link>
        }
        title={
          <>
            {t('Bug report')}{' '}
            <span className={`status status--${open ? 'lost' : 'won'}`}>
              <Icon name={open ? 'dot' : 'check-circle'} />
              {report.status}
            </span>
          </>
        }
        actions={
          <Button tone={open ? 'green' : 'orange'} busy={busy} onClick={() => triage({ status: open ? 'closed' : 'open' })} icon={<Icon name={open ? 'check' : 'refresh'} />}>
            {open ? t('Close') : t('Reopen')}
          </Button>
        }
      />
      <Panel tone="glow">
        <blockquote className="bug__quote">
          <Icon name="note" />
          <span>{report.description}</span>
        </blockquote>
        <p className="bug__by">
          <span className="who">
            <Avatar name={report.reporter_name ?? report.reporter} player={report.reporter} size="sm" />
            {report.reporter_name ?? report.reporter}
          </span>
          <time dateTime={report.created_at}>{fmt_datetime(report.created_at, 'medium')}</time>
          {c.build ? <span className="mono">{t('build {build}', { build: String(c.build) })}</span> : null}
        </p>
        <div className="row">
          {history ? (
            <>
              <AnchorButton href={`${GAME_URL}/?report=${report.id}`} icon={<Icon name="play" />}>
                {t('Replay it in the game')}
              </AnchorButton>
              <AnchorButton tone="grey" href={`${GAME_URL}/?report=${report.id}&at=${report.game_version ?? history.commands.length}`} icon={<Icon name="target" />}>
                {t('Open the run where it was reported')}
              </AnchorButton>
            </>
          ) : null}
          <Button tone="grey" onClick={() => download(report)} icon={<Icon name="download" />}>
            {t('Download (JSON)')}
          </Button>
        </div>
        {history ? (
          <p className="muted">
            {t('The replay rebuilds the run from its {n} moves (engine {engine}) where the recording starts, then plays the player’s inputs again. The API rebuilds runs for the accounts in ADMINS.', { n: history.commands.length, engine: history.engine_version })}
          </p>
        ) : (
          <p className="muted">{c.history_error ? t('No run history ({error}).', { error: String(c.history_error) }) : report.game_id ? t('No run history.') : t('No run history: the player was not in a run.')}</p>
        )}
        {problem ? <Alert>{problem}</Alert> : null}
      </Panel>

      <div className="grid-2">
        <Panel title={t('Screen')} icon="image">
          {report.screenshot_url ? (
            shot ? (
              <img className="bug__shot" src={shot} alt={t('the game when the player reported')} />
            ) : (
              <Spinner />
            )
          ) : (
            <EmptyState icon="image" title={t('No screenshot')} />
          )}
        </Panel>
        <Panel title={t('Where')} icon="target">
          <dl className="facts facts--single">
            <Fact label={t('Run')} value={report.game_id ? t('{id}, version {version}', { id: report.game_id.slice(0, 8), version: String(report.game_version) }) : '–'} />
            <Fact label={t('Moves in its history')} value={history ? String(history.commands.length) : '–'} />
            <Fact label={t('Seed, deck, stake')} value={history ? `${String(history.settings.seed)}, ${String(history.settings.deck)}, ${String(history.settings.stake)}` : '–'} />
            <Fact label={t('Screen')} value={c.state ? `${String(c.stage)} · ${String(c.state)}${c.busy ? ` ${t('(an action was playing)')}` : ''}` : '–'} />
            <Fact label={t('Recording')} value={`${t('{n} events over {s} s', { n: events.length, s: Math.round(span) })}${rec.dropped ? ` ${t('({n} older dropped)', { n: rec.dropped })}` : ''}`} />
            <Fact label={t('Browser')} value={String(c.user_agent ?? '–')} />
            <Fact label={t('Window')} value={c.screen ? JSON.stringify(c.screen) : '–'} />
            <Fact label={t('Settings')} value={c.settings ? JSON.stringify(c.settings) : '–'} />
          </dl>
        </Panel>
      </div>

      <Panel title={`Errors (${errors.length})`} icon="alert" tone={errors.length ? 'danger' : undefined}>
        {errors.length ? (
          <ul className="errors">
            {errors.map((e, i) => (
              <li key={i}>
                <details>
                  <summary>
                    <span className="timeline__t">{(e.t - end).toFixed(2)}s</span> <strong>{e.message}</strong> <span className="muted">({e.source})</span>
                  </summary>
                  {e.stack ? <pre>{e.stack}</pre> : null}
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="check-circle" title={t('The game recorded no error')} />
        )}
      </Panel>

      <Panel title={t('What happened before')} icon="history">
        <Timeline events={events} end={end} />
      </Panel>

      <Panel title={t('Notes')} icon="note">
        <div className="form">
          <div className="field">
            <label htmlFor="bug-notes">{t('For the developers (the player doesn’t see them)')}</label>
            <textarea id="bug-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <p>
            <Button busy={busy} disabled={notes === report.notes} onClick={() => triage({ notes })} icon={<Icon name="check" />}>
              {t('Save the notes')}
            </Button>
          </p>
        </div>
      </Panel>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="facts__row">
      <dt>{label}</dt>
      <dd className="bug__fact">{value}</dd>
    </div>
  );
}
