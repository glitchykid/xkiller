import { normalizePreferences, type Preferences } from '../../shared/preferences';

export const appearance = $state<Preferences>({ locale: 'ru' });
function apply(value: Preferences) {
  appearance.locale = value.locale;
  document.documentElement.lang = value.locale === 'zh' ? 'zh-Hans' : value.locale;
}
export async function initializePreferences() {
  const fallback: Preferences = {
    locale: 'ru',
  };
  let value = fallback;
  try {
    if (window.xkiller)
      value = normalizePreferences(await window.xkiller.getPreferences(), fallback);
    else {
      const saved = localStorage.getItem('xkiller-preferences');
      value = normalizePreferences(saved ? JSON.parse(saved) : null, fallback);
    }
  } catch {
    /* Appearance must never block opening research data. */
  }
  apply(value);
}
export async function savePreferences(value: Preferences) {
  const plain = { locale: value.locale };
  if (window.xkiller) await window.xkiller.setPreferences(plain);
  else localStorage.setItem('xkiller-preferences', JSON.stringify(plain));
  apply(plain);
}
