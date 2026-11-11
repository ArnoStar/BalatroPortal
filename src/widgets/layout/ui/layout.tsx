import { useEffect, useRef, useState } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { GAME_URL } from '@/shared/config';
import { AnchorButton, Icon } from '@/shared/ui';
import { use_links } from '../model/links';
import { Backdrop } from './backdrop';
import { Palette } from './palette';
import { Brand, Mark, Sidebar } from './sidebar';

/** typing in a field: "/" is a character there, not the search */
const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/** The shell of every page: the sidebar (a drawer on narrow screens), the page, the footer, the search palette. */
export function Layout() {
  const groups = use_links();
  const drawer = useRef<HTMLDialogElement>(null);
  const [searching, setSearching] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    drawer.current?.close();
  }, [pathname]);

  useEffect(() => {
    const on_key = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearching((open) => !open);
      } else if (e.key === '/' && !typing(e.target) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setSearching(true);
      }
    };
    window.addEventListener('keydown', on_key);
    return () => window.removeEventListener('keydown', on_key);
  }, []);

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to the content
      </a>
      <Backdrop />
      <aside className="sidebar" aria-label="Site">
        <Sidebar groups={groups} onSearch={() => setSearching(true)} />
      </aside>
      <header className="topbar">
        <button type="button" className="icon-button" aria-label="Open the menu" onClick={() => drawer.current?.showModal()}>
          <Icon name="menu" />
        </button>
        <Brand />
        <button type="button" className="icon-button" aria-label="Search" onClick={() => setSearching(true)}>
          <Icon name="search" />
        </button>
        <AnchorButton size="sm" href={`${GAME_URL}/`} icon={<Icon name="play" />}>
          Play
        </AnchorButton>
      </header>
      <dialog
        ref={drawer}
        className="drawer"
        aria-label="Menu"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <aside className="sidebar">
          <button type="button" className="icon-button drawer__close" aria-label="Close the menu" onClick={() => drawer.current?.close()}>
            <Icon name="close" />
          </button>
          <Sidebar
            groups={groups}
            onSearch={() => {
              drawer.current?.close();
              setSearching(true);
            }}
          />
        </aside>
      </dialog>
      <div className="main">
        <main className="main__content" id="main" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="site-footer">
          <Mark />
          <span>A fan-made browser version of Balatro, played with the original game's rules.</span>
          <span>Balatro is a game by LocalThunk, published by Playstack.</span>
        </footer>
      </div>
      <Palette open={searching} onClose={() => setSearching(false)} groups={groups} />
      <ScrollRestoration />
    </div>
  );
}
