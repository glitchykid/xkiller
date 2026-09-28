import { locales, type Locale } from './preferences';
import { messages } from '../src/lib/messages';

export function translate(
  key: string,
  locale: Locale,
  params: Record<string, string | number> = {},
): string {
  const row = messages[key];
  const text = row ? row[locales.indexOf(locale)] : key;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match));
}
