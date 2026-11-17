// Numbers as the game writes them (number_format in misc_functions.lua):
// grouped digits (the player's language's way), scientific notation from 100
// billion, "naneinf" past the largest number.
import type { Score } from '@/shared/api';
import { current_lang } from '@/shared/i18n';

export function format_number(x: Score): string {
  if (typeof x === 'string') return x === 'nan' || x === 'inf' ? 'naneinf' : x;
  if (!Number.isFinite(x)) return 'naneinf';
  if (Math.abs(x) >= 1e11) {
    const [mantissa, exponent] = x.toExponential(3).split('e');
    return `${mantissa}e${Number(exponent)}`;
  }
  return new Intl.NumberFormat(current_lang(), { maximumFractionDigits: 2 }).format(x);
}

/** compact axis ticks: 0, 12, 1.2K, 3M */
export function format_compact(x: number): string {
  return new Intl.NumberFormat(current_lang(), { notation: 'compact', maximumFractionDigits: 1 }).format(x);
}

export function format_percent(part: number, whole: number): string {
  return whole ? new Intl.NumberFormat(current_lang(), { style: 'percent', maximumFractionDigits: 0 }).format(part / whole) : '–';
}
