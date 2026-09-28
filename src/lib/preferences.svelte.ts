import { normalizePreferences, themeBackground, type Preferences } from '../../shared/preferences';

export const appearance = $state<Preferences>({ theme: 'light', locale: 'ru' });
function apply(value: Preferences) {
  appearance.theme = value.theme;
  appearance.locale = value.locale;
  document.documentElement.dataset.theme = value.theme;
  document.documentElement.lang = value.locale === 'zh' ? 'zh-Hans' : value.locale;
  document.documentElement.style.colorScheme = value.theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', themeBackground(value.theme));
}
export async function initializePreferences() {
  const fallback: Preferences = {
    theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    locale: 'ru',
  };
  let value = fallback;
  try {
    if (window.xkiller)
      value = normalizePreferences(await window.xkiller.getPreferences(), fallback);
    else {
      const saved = localStorage.getItem('xkiller-preferences');
      value = normalizePreferences(
        saved ? JSON.parse(saved) : { theme: localStorage.getItem('xkiller-theme') },
        fallback,
      );
    }
  } catch {
    /* Appearance must never block opening research data. */
  }
  apply(value);
}
export async function savePreferences(value: Preferences) {
  const plain = { theme: value.theme, locale: value.locale };
  if (window.xkiller) await window.xkiller.setPreferences(plain);
  else localStorage.setItem('xkiller-preferences', JSON.stringify(plain));
  apply(plain);
}
