import { useSession } from '@/entities/session';
import { game_api } from '@/shared/api';
import { use_async } from '@/shared/lib';
import { Spinner } from '@/shared/ui';
import { Dashboard } from './dashboard';
import { Hero } from './hero';
import { Landing } from './landing';

/** The site's front door: the hero, then a visitor's landing or a player's dashboard. */
export function HomePage() {
  const { status } = useSession();
  const health = use_async(() => game_api.health(), []);
  const open = health.data?.auth === 'off'; // the game server runs without sign-in

  if (status === 'loading') return <Spinner />;

  return (
    <div className="home">
      <Hero open={open} />
      {status === 'signed-in' ? <Dashboard /> : <Landing open={open} />}
    </div>
  );
}
