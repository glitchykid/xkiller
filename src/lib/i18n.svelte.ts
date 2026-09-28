import { appearance } from './preferences.svelte';
import { translate } from '../../shared/localization';

export function t(key: string, params: Record<string, string | number> = {}): string {
  return translate(key, appearance.locale, params);
}

export function featureLabel(value: string) {
  const [frame, name] = value.split(' · ');
  return name ? `${frame} · ${t(name)}` : t(value);
}
