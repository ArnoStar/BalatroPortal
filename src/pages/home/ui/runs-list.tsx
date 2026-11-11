import { useState } from 'react';
import { RunCard } from '@/widgets/run-card';
import { describe, game_api, type RunSummary } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { Alert, AnchorButton, Button, EmptyState, Icon, Panel, Spinner } from '@/shared/ui';

interface Runs {
  data: RunSummary[] | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
}

/** The player's runs, most recent first (the game's Continue opens the latest unfinished one). */
export function RunsList({ runs }: { runs: Runs }) {
  const { data, error, loading, reload } = runs;
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
    <Panel title="Your runs" icon="history" actions={data?.length ? <span className="muted">{data.length} most recent</span> : null}>
      {loading && !data ? <Spinner /> : null}
      {error ? <Alert>{describe(error)}</Alert> : null}
      {action_error ? <Alert>{action_error}</Alert> : null}
      {data && !data.length ? (
        <EmptyState
          icon="play"
          title="No run yet"
          action={
            <AnchorButton href={`${GAME_URL}/`} icon={<Icon name="play" />}>
              Start one
            </AnchorButton>
          }
        >
          Your runs show up here, with their seed, to watch them again.
        </EmptyState>
      ) : null}
      {data?.length ? (
        <ul className={`runs${loading ? ' refreshing' : ''}`}>
          {data.map((run) => (
            <RunCard
              key={run.id}
              run={run}
              watch
              actions={
                <Button
                  tone="ghost"
                  size="sm"
                  busy={deleting === run.id}
                  onClick={() => remove(run.id)}
                  aria-label="Delete this run"
                  icon={<Icon name="trash" />}
                >
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
