import { useNavigate } from 'react-router';
import { useSession } from '@/entities/session';
import { GAME_URL } from '@/shared/config';
import type { Tokens } from '@/shared/api';

/** sign in with these tokens, then go to `next` (the game is another app: a full page load) */
export function useFinishSignIn() {
  const { sign_in } = useSession();
  const navigate = useNavigate();
  return async (tokens: Tokens, next: string) => {
    await sign_in(tokens);
    if (next === GAME_URL || next.startsWith(`${GAME_URL}/`) || next.startsWith(`${GAME_URL}?`)) window.location.assign(next);
    else navigate(next, { replace: true });
  };
}
