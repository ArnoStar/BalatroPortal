import { Navigate, useSearchParams } from 'react-router';
import { ConfirmEmailForm } from '@/features/auth';
import { AuthShell } from '@/widgets/auth-shell';
import { safe_next } from '@/shared/lib';

export function ConfirmEmailPage() {
  const [params] = useSearchParams();
  const email = params.get('email');
  if (!email) return <Navigate to="/register" replace />;
  return (
    <AuthShell title="Confirm your email" icon="mail">
      <ConfirmEmailForm email={email} next={safe_next(params.get('next'))} resend={params.get('resend') === '1'} />
    </AuthShell>
  );
}
