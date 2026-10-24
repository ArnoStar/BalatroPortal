import { NavLink, Outlet, Link } from 'react-router';
import { useSession } from '@/entities/session';
import { GAME_URL } from '@/shared/config';

export function Layout() {
  const { status, account } = useSession();
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
