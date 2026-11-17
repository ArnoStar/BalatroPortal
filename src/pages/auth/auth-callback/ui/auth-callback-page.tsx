import { useMemo } from 'react';
import { useLocation } from 'react-router';
import { OAuthCallback } from '@/features/auth';
import { AuthShell } from '@/widgets/auth-shell';
import { t } from '@/shared/i18n';

export function AuthCallbackPage() {
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  return (
    <AuthShell title={t('Signing in')} icon="login">
      <OAuthCallback params={params} />
    </AuthShell>
  );
}
