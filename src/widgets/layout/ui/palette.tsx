// The search palette (Ctrl K, ⌘ K or /): every page the player can open, and
// signing in or out, found by typing a few letters.
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '@/entities/session';
import { GAME_URL } from '@/shared/config';
import { Icon, type IconName } from '@/shared/ui';
import type { LinkGroup } from '../model/links';

interface Entry {
  key: string;
  label: string;
  hint: string;
  icon: IconName;
  run: () => void;
}

export function Palette({ open, onClose, groups }: { open: boolean; onClose: () => void; groups: LinkGroup[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { status, sign_out } = useSession();
  const list = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery('');
      setActive(0);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const entries = useMemo(() => {
    const go = (to: string) => () => navigate(to, { viewTransition: true });
    const all: Entry[] = [
      { key: 'play', label: 'Play', hint: 'Open the game', icon: 'play', run: () => window.location.assign(`${GAME_URL}/`) },
      ...groups.flatMap((g) => g.links.map((l): Entry => ({ key: l.to, label: l.label, hint: l.hint, icon: l.icon, run: go(l.to) }))),
    ];
    if (status === 'signed-in') {
      all.push(
        { key: 'account', label: 'Your account', hint: 'Name, sign-in methods, sessions', icon: 'settings', run: go('/account') },
        { key: 'new-trade', label: 'Make an offer', hint: 'Trade items with a player', icon: 'swap', run: go('/trades/new') },
        { key: 'logout', label: 'Log out', hint: 'On this device', icon: 'logout', run: () => void sign_out().then(() => navigate('/')) },
      );
    } else if (status === 'signed-out') {
      all.push(
        { key: 'login', label: 'Sign in', hint: 'With your email or Google', icon: 'login', run: go('/login') },
        { key: 'register', label: 'Create an account', hint: 'Free, and your runs are kept', icon: 'user-plus', run: go('/register') },
      );
    }
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return words.length ? all.filter((e) => words.every((w) => `${e.label} ${e.hint}`.toLowerCase().includes(w))) : all;
  }, [query, groups, status, navigate, sign_out]);

  useEffect(() => {
    document.getElementById(`${list}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, list]);

  function choose(entry: Entry) {
    onClose();
    entry.run();
  }

  function on_key(e: KeyboardEvent<HTMLInputElement>) {
    const n = entries.length;
    if (!n) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % n);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + n) % n);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const entry = entries[Math.min(active, n - 1)];
      if (entry) choose(entry);
    }
  }

  return (
    <dialog
      ref={ref}
      className="palette"
      aria-label="Go to a page"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="palette__search">
        <Icon name="search" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={on_key}
          placeholder="Where to?"
          aria-label="Search the site"
          role="combobox"
          aria-expanded="true"
          aria-controls={list}
          aria-activedescendant={entries.length ? `${list}-${Math.min(active, entries.length - 1)}` : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        <kbd>Esc</kbd>
      </div>
      <ul className="palette__list" id={list} role="listbox" aria-label="Pages">
        {entries.map((entry, i) => (
          <li
            key={entry.key}
            id={`${list}-${i}`}
            role="option"
            aria-selected={i === active}
            className="palette__item"
            onPointerMove={() => setActive(i)}
            onClick={() => choose(entry)}
          >
            <span className="palette__icon">
              <Icon name={entry.icon} />
            </span>
            <span className="palette__label">
              {entry.label}
              <small>{entry.hint}</small>
            </span>
            <Icon name="arrow-right" className="palette__go" />
          </li>
        ))}
        {entries.length ? null : (
          <li className="palette__none" role="presentation">
            Nothing matches “{query}”.
          </li>
        )}
      </ul>
      <footer className="palette__foot" aria-hidden>
        <span>
          <kbd>↑</kbd> <kbd>↓</kbd> move
        </span>
        <span>
          <kbd>Enter</kbd> open
        </span>
        <span>
          <kbd>Esc</kbd> close
        </span>
      </footer>
    </dialog>
  );
}
