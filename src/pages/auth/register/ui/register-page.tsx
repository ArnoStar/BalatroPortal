import { useSearchParams } from 'react-router';
import { ProviderButtons, RegisterForm } from '@/features/auth';
import { AuthShell } from '@/widgets/auth-shell';
import { safe_next } from '@/shared/lib';
import { t } from '@/shared/i18n';

export function RegisterPage() {
  const [params] = useSearchParams();
  const next = safe_next(params.get('next'));
  return (
    <AuthShell title={t('Create an account')} icon="user-plus" lead={t('Free. Your runs, stats and items stay with it.')}>
      <RegisterForm next={next} />
      <ProviderButtons next={next} />
    </AuthShell>
  );
}
