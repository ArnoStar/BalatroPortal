import { useMemo } from 'react';
import { useLocation } from 'react-router';
import { OAuthCallback } from '@/features/auth';
import { Panel } from '@/shared/ui';

export function AuthCallbackPage() {
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  return (
    <Panel title="Signing in" narrow>
      <OAuthCallback params={params} />
    </Panel>
  );
}
