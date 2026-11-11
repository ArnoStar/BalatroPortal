import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';

/** blue: the main action; red: a loss or danger; orange: trades and offers; green: a gain; grey: the quiet one; ghost: no fill */
export type Tone = 'blue' | 'red' | 'orange' | 'green' | 'grey' | 'ghost';
export type Size = 'sm' | 'md' | 'lg';

interface Look {
  tone?: Tone;
  size?: Size;
  wide?: boolean;
  /** an icon before the text (replaced by the spinner while busy) */
  icon?: ReactNode;
}

const classes = ({ tone = 'blue', size = 'md', wide = false }: Look, className?: string) =>
  ['btn', `btn--${tone}`, `btn--${size}`, wide && 'btn--wide', className].filter(Boolean).join(' ');

interface ButtonProps extends Look, ButtonHTMLAttributes<HTMLButtonElement> {
  busy?: boolean;
}

export function Button({ tone, size, wide, icon, busy = false, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button className={classes({ tone, size, wide }, className)} disabled={disabled || busy} aria-busy={busy || undefined} type={type} {...rest}>
      {busy ? <span className="spinner" aria-hidden /> : icon}
      {children}
    </button>
  );
}

interface LinkButtonProps extends Look, LinkProps {
  /** (the old name of size="lg") */
  big?: boolean;
  children: ReactNode;
}

export function LinkButton({ tone, size, wide, big = false, icon, className, children, ...rest }: LinkButtonProps) {
  return (
    <Link className={classes({ tone, size: big ? 'lg' : size, wide }, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

/** a link out of the portal (the game is another app: a full page load) */
export function AnchorButton({ tone, size, wide, big = false, icon, href, className, children }: Look & {
  big?: boolean; href: string; className?: string; children: ReactNode;
}) {
  return (
    <a className={classes({ tone, size: big ? 'lg' : size, wide }, className)} href={href}>
      {icon}
      {children}
    </a>
  );
}
