import { Navigate, useSearchParams } from 'react-router';
import { ConfirmEmailForm } from '@/features/auth';
import { safe_next } from '@/shared/lib';
import { Panel } from '@/shared/ui';

export function ConfirmEmailPage() {
  const [params] = useSearchParams();
  const email = params.get('email');
  if (!email) return <Navigate to="/register" replace />;
  return (
    <Panel title="Confirm your email" narrow>
      <ConfirmEmailForm email={email} next={safe_next(params.get('next'))} resend={params.get('resend') === '1'} />
    </Panel>
  );
}
