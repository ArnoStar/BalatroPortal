import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';

/** the game's button colours */
export type Tone = 'blue' | 'red' | 'orange' | 'green' | 'grey';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  busy?: boolean;
  wide?: boolean;
}

export function Button({ tone = 'blue', busy = false, wide = false, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={['btn', `btn--${tone}`, wide && 'btn--wide', className].filter(Boolean).join(' ')}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <span className="spinner" aria-hidden /> : null}
      {children}
    </button>
  );
}

interface LinkButtonProps extends LinkProps {
  tone?: Tone;
  wide?: boolean;
  big?: boolean;
  children: ReactNode;
}

export function LinkButton({ tone = 'blue', wide = false, big = false, className, children, ...rest }: LinkButtonProps) {
  return (
    <Link className={['btn', `btn--${tone}`, wide && 'btn--wide', big && 'btn--big', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </Link>
  );
}

/** a link out of the portal (the game is another app: a full page load) */
export function AnchorButton({ tone = 'blue', big = false, href, children }: { tone?: Tone; big?: boolean; href: string; children: ReactNode }) {
  return (
    <a className={['btn', `btn--${tone}`, big && 'btn--big'].filter(Boolean).join(' ')} href={href}>
      {children}
    </a>
  );
}
