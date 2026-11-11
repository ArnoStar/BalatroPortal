import { Navigate, useSearchParams } from 'react-router';
import { ResetPasswordForm } from '@/features/auth';
import { AuthShell } from '@/widgets/auth-shell';
import { safe_next } from '@/shared/lib';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const email = params.get('email');
  if (!email) return <Navigate to="/forgot" replace />;
  return (
    <AuthShell title="Choose a new password" icon="lock">
      <ResetPasswordForm email={email} next={safe_next(params.get('next'))} />
    </AuthShell>
  );
}
