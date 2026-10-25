import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Timeline } from './timeline';
import { describe, reports_api, ProblemError, type Report } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { use_async } from '@/shared/lib';
import { Alert, AnchorButton, Button, Panel, Spinner } from '@/shared/ui';

const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' });

/** One bug report: what the player said and what the game recorded, and the way to see it again. */
export function BugPage() {
  const { id = '' } = useParams();
  const { data, error, loading } = use_async(() => reports_api.get(id), [id]);
  if (loading && !data) return <Spinner />;
  if (error instanceof ProblemError && error.code === 'not_admin') return <Alert>Bug reports are for the developers.</Alert>;
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
    if (report.screenshot_url) reports_api.screenshot(report.id).then((u) => { url = u; setShot(u); }, () => setShot(null));
    return () => { if (url) URL.revokeObjectURL(url); };
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
  return (
    <div className="stack">
      <p>
        <Link to="/bugs">← Bug reports</Link>
      </p>
      <Panel title={<>Bug report <span className={`tag${report.status === 'open' ? ' tag--warn' : ''}`}>{report.status}</span></>}>
        <blockquote className="bug__quote">{report.description}</blockquote>
        <p className="muted">
          {report.reporter_name ?? report.reporter} · <time dateTime={report.created_at}>{when.format(new Date(report.created_at))}</time>
          {c.build ? ` · build ${String(c.build)}` : ''}
        </p>
        <div className="row">
          {history ? (
            <>
              <AnchorButton href={`${GAME_URL}/?report=${report.id}`}>Replay it in the game</AnchorButton>
              <AnchorButton tone="grey" href={`${GAME_URL}/?report=${report.id}&at=${report.game_version ?? history.commands.length}`}>
                Open the run where it was reported
              </AnchorButton>
            </>
          ) : null}
          <Button tone="grey" onClick={() => download(report)}>Download (JSON)</Button>
          <Button tone={report.status === 'open' ? 'green' : 'orange'} busy={busy} onClick={() => triage({ status: report.status === 'open' ? 'closed' : 'open' })}>
            {report.status === 'open' ? 'Close' : 'Reopen'}
          </Button>
        </div>
        {history ? (
          <p className="muted">
            The replay rebuilds the run from its {history.commands.length} moves (engine {history.engine_version}) where the recording starts, then plays
            the player's inputs again. The API rebuilds runs for the accounts in ADMINS.
          </p>
        ) : (
          <p className="muted">No run history{c.history_error ? ` (${String(c.history_error)})` : report.game_id ? '' : ': the player was not in a run'}.</p>
        )}
        {problem ? <Alert>{problem}</Alert> : null}
      </Panel>

      <div className="grid-2">
        <Panel title="Screen">
          {report.screenshot_url ? (shot ? <img className="bug__shot" src={shot} alt="the game when the player reported" /> : <Spinner />) : <p className="muted">No screenshot.</p>}
        </Panel>
        <Panel title="Where">
          <dl className="facts">
            <Fact label="Run" value={report.game_id ? `${report.game_id.slice(0, 8)}, version ${report.game_version}` : '–'} />
            <Fact label="Moves in its history" value={history ? String(history.commands.length) : '–'} />
            <Fact label="Seed, deck, stake" value={history ? `${String(history.settings.seed)}, ${String(history.settings.deck)}, ${String(history.settings.stake)}` : '–'} />
            <Fact label="Screen" value={c.state ? `${String(c.stage)} · ${String(c.state)}${c.busy ? ' (an action was playing)' : ''}` : '–'} />
            <Fact label="Recording" value={`${events.length} events over ${Math.round(span)} s${rec.dropped ? ` (${rec.dropped} older dropped)` : ''}`} />
            <Fact label="Browser" value={String(c.user_agent ?? '–')} />
            <Fact label="Window" value={c.screen ? JSON.stringify(c.screen) : '–'} />
            <Fact label="Settings" value={c.settings ? JSON.stringify(c.settings) : '–'} />
          </dl>
        </Panel>
      </div>

      <Panel title={`Errors (${errors.length})`}>
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
          <p className="muted">The game recorded no error.</p>
        )}
      </Panel>

      <Panel title="What happened before">
        <Timeline events={events} end={end} />
      </Panel>

      <Panel title="Notes">
        <div className="form">
          <div className="field">
            <label htmlFor="bug-notes">For the developers (the player doesn't see them)</label>
            <textarea id="bug-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <p>
            <Button busy={busy} disabled={notes === report.notes} onClick={() => triage({ notes })}>Save the notes</Button>
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
