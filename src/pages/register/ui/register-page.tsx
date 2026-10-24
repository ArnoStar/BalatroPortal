import { useSearchParams } from 'react-router';
import { ProviderButtons, RegisterForm } from '@/features/auth';
import { safe_next } from '@/shared/lib';
import { Panel } from '@/shared/ui';

export function RegisterPage() {
  const [params] = useSearchParams();
  const next = safe_next(params.get('next'));
  return (
    <Panel title="Create an account" narrow>
      <RegisterForm next={next} />
      <ProviderButtons next={next} />
    </Panel>
  );
}
