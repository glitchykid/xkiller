import { appearance } from './preferences.svelte';
import { formatLocales } from '../../shared/preferences';

const numberFormats = new Map<string, Intl.NumberFormat>();
export function number(value: number, digits = 2) {
  const key = appearance.locale + digits;
  if (!numberFormats.has(key))
    numberFormats.set(
      key,
      new Intl.NumberFormat(formatLocales[appearance.locale], {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }),
    );
  return numberFormats.get(key)!.format(value);
}
export const money = (value: number) => number(value);
export const integer = (value: number) => number(value, 0);
export const pct = (value: number) =>
  new Intl.NumberFormat(formatLocales[appearance.locale], {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
  }).format(value / 100);
export const date = (value: number | string) =>
  new Date(value).toLocaleDateString(formatLocales[appearance.locale], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
export const time = (value: number) =>
  new Date(value).toLocaleString(formatLocales[appearance.locale], {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
