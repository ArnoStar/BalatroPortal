import { useSearchParams } from 'react-router';
import { ForgotPasswordForm } from '@/features/auth';
import { safe_next } from '@/shared/lib';
import { Panel } from '@/shared/ui';

export function ForgotPasswordPage() {
  const [params] = useSearchParams();
  return (
    <Panel title="Forgot your password?" narrow>
      <ForgotPasswordForm next={safe_next(params.get('next'))} email={params.get('email') ?? ''} />
    </Panel>
  );
}
