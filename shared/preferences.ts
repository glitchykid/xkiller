export const locales = ['ru', 'en', 'uk', 'ko', 'ja', 'zh'] as const;
export type Locale = (typeof locales)[number];
export type Theme = 'light' | 'dark';
export interface Preferences {
  theme: Theme;
  locale: Locale;
}
export const languageNames: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
  uk: 'Українська',
  ko: '한국어',
  ja: '日本語',
  zh: '简体中文',
};
export const formatLocales: Record<Locale, string> = {
  ru: 'ru-RU',
  en: 'en-US',
  uk: 'uk-UA',
  ko: 'ko-KR',
  ja: 'ja-JP',
  zh: 'zh-CN',
};
export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}
export function isLocale(value: unknown): value is Locale {
  return locales.includes(value as Locale);
}
export function normalizePreferences(value: unknown, fallback: Preferences): Preferences {
  const input = value && typeof value === 'object' ? (value as Partial<Preferences>) : {};
  return {
    theme: isTheme(input.theme) ? input.theme : fallback.theme,
    locale: isLocale(input.locale) ? input.locale : fallback.locale,
  };
}
export function validatePreferences(value: unknown): Preferences {
  if (!value || typeof value !== 'object') throw new Error('Invalid preferences');
  const input = value as Preferences;
  if (!isTheme(input.theme) || !isLocale(input.locale)) throw new Error('Invalid preferences');
  return { theme: input.theme, locale: input.locale };
}
export const themeBackground = (theme: Theme) => (theme === 'dark' ? '#0c1222' : '#edf1fa');
