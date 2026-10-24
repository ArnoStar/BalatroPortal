import { useSession } from '@/entities/session';
import { RunsList } from './runs-list';
import { game_api } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { use_async } from '@/shared/lib';
import { AnchorButton, LinkButton, Panel, Spinner } from '@/shared/ui';

export function HomePage() {
  const { status, account } = useSession();
  const health = use_async(() => game_api.health(), []);
  const open = health.data?.auth === 'off'; // the game server runs without sign-in

  if (status === 'loading') return <Spinner />;

  return (
    <div className="home">
      <section className="hero">
        <h1 className="hero__title">BALATRO</h1>
        <p className="hero__lead">The poker roguelike, in your browser, with the original game's rules: same seed, same run.</p>
        <div className="hero__actions">
          {status === 'signed-in' || open ? (
            <AnchorButton big href={`${GAME_URL}/`}>
              PLAY
            </AnchorButton>
          ) : (
            <>
              <LinkButton big to={`/login?${new URLSearchParams({ next: `${GAME_URL}/` })}`}>
                SIGN IN TO PLAY
              </LinkButton>
              <LinkButton big tone="green" to={`/register?${new URLSearchParams({ next: `${GAME_URL}/` })}`}>
                CREATE AN ACCOUNT
              </LinkButton>
            </>
          )}
        </div>
        {status === 'signed-in' && account ? <p className="hero__hello">Welcome back, {account.display_name}.</p> : null}
      </section>
      {status === 'signed-in' ? <RunsList /> : null}
      {status !== 'signed-in' && open ? (
        <Panel>
          <p className="muted">This server runs without accounts: everyone plays as the same player.</p>
        </Panel>
      ) : null}
    </div>
  );
}
