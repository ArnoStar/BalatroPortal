import { useSearchParams } from 'react-router';
import { ForgotPasswordForm } from '@/features/auth';
import { AuthShell } from '@/widgets/auth-shell';
import { safe_next } from '@/shared/lib';

export function ForgotPasswordPage() {
  const [params] = useSearchParams();
  return (
    <AuthShell title="Forgot your password?" icon="key">
      <ForgotPasswordForm next={safe_next(params.get('next'))} email={params.get('email') ?? ''} />
    </AuthShell>
  );
}
