// Numbers as the game writes them (number_format in misc_functions.lua):
// grouped digits, scientific notation from 100 billion, "naneinf" past the
// largest number.
import type { Score } from '@/shared/api';

const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function format_number(x: Score): string {
  if (typeof x === 'string') return x === 'nan' || x === 'inf' ? 'naneinf' : x;
  if (!Number.isFinite(x)) return 'naneinf';
  if (Math.abs(x) >= 1e11) {
    const [mantissa, exponent] = x.toExponential(3).split('e');
    return `${mantissa}e${Number(exponent)}`;
  }
  return grouped.format(x);
}

/** compact axis ticks: 0, 12, 1.2K, 3M */
export function format_compact(x: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(x);
}

export function format_percent(part: number, whole: number): string {
  return whole ? `${Math.round((100 * part) / whole)}%` : '–';
}
