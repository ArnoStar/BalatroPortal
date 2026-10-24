import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '@/entities/session';
import { Layout } from '@/widgets/layout';
import { AccountPage } from '@/pages/account';
import { AuthCallbackPage } from '@/pages/auth-callback';
import { ConfirmEmailPage } from '@/pages/confirm-email';
import { ForgotPasswordPage } from '@/pages/forgot-password';
import { HomePage } from '@/pages/home';
import { LoginPage } from '@/pages/login';
import { NotFoundPage } from '@/pages/not-found';
import { RegisterPage } from '@/pages/register';
import { ResetPasswordPage } from '@/pages/reset-password';
import { Spinner } from '@/shared/ui';

/** pages for signed-in players only: the others go to the sign-in, and come back */
function RequireSignIn() {
  const { status } = useSession();
  const location = useLocation();
  if (status === 'loading') return <Spinner />;
  if (status === 'signed-out') {
    return <Navigate to={`/login?${new URLSearchParams({ next: location.pathname + location.search })}`} replace />;
  }
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'confirm', element: <ConfirmEmailPage /> },
      { path: 'forgot', element: <ForgotPasswordPage /> },
      { path: 'reset', element: <ResetPasswordPage /> },
      { path: 'auth/callback', element: <AuthCallbackPage /> },
      { element: <RequireSignIn />, children: [{ path: 'account', element: <AccountPage /> }] },
      // (the game is at /play/: a link there leaves the portal)
      { path: 'play/*', element: <Navigate to="/" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
