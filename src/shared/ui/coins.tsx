import { fmt_compact, fmt_number, t } from '@/shared/i18n';

/** an amount of coins (the casino's chip, the same coins): `compact` 12.4K */
export function Coins({ value, compact = false, size = 'md', className }: {
  value: number; compact?: boolean; size?: 'sm' | 'md' | 'lg'; className?: string;
}) {
  return (
    <span className={['coins', `coins--${size}`, className].filter(Boolean).join(' ')} title={t('{n} coins', { n: fmt_number(value) })}>
      <span className="coins__chip" aria-hidden />
      <span className="coins__n">{compact ? fmt_compact(value) : fmt_number(value)}</span>
      <span className="visually-hidden"> {t('coins')}</span>
    </span>
  );
}
