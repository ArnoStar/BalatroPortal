import { useState } from 'react';
import { RunCard } from './run-card';
import { game_api, describe } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { use_async } from '@/shared/lib';
import { Alert, Button, Panel, Spinner } from '@/shared/ui';

/** The player's runs, most recent first (the game's Continue opens the latest unfinished one). */
export function RunsList() {
  const { data, error, loading, reload } = use_async(() => game_api.runs(20), []);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [action_error, setActionError] = useState<string | null>(null);

  async function remove(id: string) {
    if (!window.confirm('Delete this run for good?')) return;
    setDeleting(id);
    setActionError(null);
    try {
      await game_api.delete_run(id);
      reload();
    } catch (err) {
      setActionError(describe(err));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Panel title="Your runs">
      {loading && !data ? <Spinner /> : null}
      {error ? <Alert>{describe(error)}</Alert> : null}
      {action_error ? <Alert>{action_error}</Alert> : null}
      {data && !data.length ? (
        <p className="muted">
          No run yet. <a href={`${GAME_URL}/`}>Start one</a>.
        </p>
      ) : null}
      {data?.length ? (
        <ul className="runs">
          {data.map((run) => (
            <RunCard
              key={run.id}
              run={run}
              actions={
                <Button tone="grey" className="btn--small" busy={deleting === run.id} onClick={() => remove(run.id)} aria-label="Delete this run">
                  Delete
                </Button>
              }
            />
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
