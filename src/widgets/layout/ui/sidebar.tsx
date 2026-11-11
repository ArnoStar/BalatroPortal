import { useId } from 'react';
import { Link, NavLink } from 'react-router';
import { useSession } from '@/entities/session';
import { GAME_URL } from '@/shared/config';
import { AnchorButton, Avatar, Icon, LinkButton } from '@/shared/ui';
import type { LinkGroup } from '../model/links';

const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

/** the portal's mark: a blue card (chips) and a red one (mult), and the spark between them */
export function Mark({ className = 'brand__mark' }: { className?: string }) {
  const id = useId();
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#62a8ff" />
          <stop offset="1" stopColor="#5b45ff" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8aa0" />
          <stop offset="1" stopColor="#e0285a" />
        </linearGradient>
      </defs>
      <rect x="4.5" y="7.5" width="17" height="24" rx="4" fill={`url(#${id}a)`} transform="rotate(-14 13 19.5)" />
      <rect x="18.5" y="8" width="17" height="24" rx="4" fill={`url(#${id}b)`} transform="rotate(13 27 20)" />
      <path d="M20 10.5c.55 3.9 2.6 5.95 6.5 6.5-3.9.55-5.95 2.6-6.5 6.5-.55-3.9-2.6-5.95-6.5-6.5 3.9-.55 5.95-2.6 6.5-6.5z" fill="#fff" />
    </svg>
  );
}

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Balatro, home" viewTransition>
      <Mark />
      <span className="brand__word">BALATRO</span>
    </Link>
  );
}

/** the sidebar's content: Play, search, the pages, and who is signed in */
export function Sidebar({ groups, onSearch }: { groups: LinkGroup[]; onSearch: () => void }) {
  const { status, account } = useSession();
  const id = useId();
  return (
    <>
      <Brand />
      <AnchorButton size="lg" className="btn--play" href={`${GAME_URL}/`} icon={<Icon name="play" />}>
        Play
      </AnchorButton>
      <button type="button" className="search-button" onClick={onSearch}>
        <Icon name="search" />
        <span>Search</span>
        <kbd>{MAC ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      <nav className="nav" aria-label="Main">
        {groups.map((group, i) => (
          <div key={group.label}>
            <p className="nav__label" id={`${id}-${i}`}>
              {group.label}
            </p>
            <ul className="nav__list" aria-labelledby={`${id}-${i}`}>
              {group.links.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} end={link.end} className="nav__link" viewTransition>
                    <Icon name={link.icon} />
                    <span>{link.label}</span>
                    {link.badge ? (
                      <span className="nav__badge">
                        {link.badge}
                        <span className="visually-hidden"> waiting</span>
                      </span>
                    ) : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="sidebar__foot">
        {status === 'signed-in' && account ? (
          <NavLink to="/account" className="me" viewTransition>
            <Avatar name={account.display_name} />
            <span className="me__text">
              <span className="me__name">{account.display_name}</span>
              <span className="me__sub">{account.roles?.length ? account.roles.join(' · ') : 'Your account'}</span>
            </span>
            <Icon name="settings" />
          </NavLink>
        ) : status === 'signed-out' ? (
          <>
            <LinkButton to="/login" wide icon={<Icon name="login" />} viewTransition>
              Sign in
            </LinkButton>
            <LinkButton to="/register" tone="grey" wide icon={<Icon name="user-plus" />} viewTransition>
              Create an account
            </LinkButton>
          </>
        ) : null}
      </div>
    </>
  );
}
