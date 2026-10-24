import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
}

/** the result of `load` (run on mount and when `deps` change) */
export function use_async<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<{ data?: T; error?: unknown; loading: boolean }>({ loading: true });
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    loadRef.current().then(
      (data) => live && setState({ data, loading: false }),
      (error: unknown) => live && setState({ error, loading: false }),
    );
    return () => {
      live = false;
    };
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data: state.data, error: state.error, loading: state.loading, reload };
}
