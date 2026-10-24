import { Navigate, useSearchParams } from 'react-router';
import { ResetPasswordForm } from '@/features/auth';
import { safe_next } from '@/shared/lib';
import { Panel } from '@/shared/ui';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const email = params.get('email');
  if (!email) return <Navigate to="/forgot" replace />;
  return (
    <Panel title="Choose a new password" narrow>
      <ResetPasswordForm email={email} next={safe_next(params.get('next'))} />
    </Panel>
  );
}
