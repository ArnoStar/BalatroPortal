import { NavLink, Outlet, Link } from 'react-router';
import { useSession } from '@/entities/session';
import { reports_api } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { use_async } from '@/shared/lib';

export function Layout() {
  const { status, account } = useSession();
  // the developers see the bug reports (the report service says who they are)
  const me = use_async(() => (status === 'loading' ? Promise.resolve(null) : reports_api.me().catch(() => null)), [status]);
  return (
    <div className="site">
      <header className="site__header">
        <Link to="/" className="logo" aria-label="Balatro, home">
          BALATRO
        </Link>
        <nav className="nav">
          <a className="nav__play" href={`${GAME_URL}/`}>
            Play
          </a>
          <NavLink to="/leaderboards">Leaderboards</NavLink>
          {status === 'signed-in' ? <NavLink to="/stats">Your stats</NavLink> : null}
          {me.data?.admin ? <NavLink to="/bugs">Bug reports</NavLink> : null}
          {status === 'signed-in' && account ? (
            <NavLink to="/account" className="nav__account">
              {account.display_name}
            </NavLink>
          ) : status === 'signed-out' ? (
            <NavLink to="/login">Sign in</NavLink>
          ) : null}
        </nav>
      </header>
      <main className="site__main">
        <Outlet />
      </main>
      <footer className="site__footer">
        A fan-made browser version of Balatro, played with the original game's rules. Balatro is a game by LocalThunk,
        published by Playstack.
      </footer>
    </div>
  );
}
