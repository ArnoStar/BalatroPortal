import { useSearchParams } from 'react-router';
import { ProviderButtons, RegisterForm } from '@/features/auth';
import { AuthShell } from '@/widgets/auth-shell';
import { safe_next } from '@/shared/lib';

export function RegisterPage() {
  const [params] = useSearchParams();
  const next = safe_next(params.get('next'));
  return (
    <AuthShell title="Create an account" icon="user-plus" lead="Free. Your runs, stats and items stay with it.">
      <RegisterForm next={next} />
      <ProviderButtons next={next} />
    </AuthShell>
  );
}
