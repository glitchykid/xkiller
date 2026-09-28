export type Theme = 'light' | 'dark';

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#141611' : '#f4f3ed');
}

export async function initializeTheme(): Promise<Theme> {
  let theme: Theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  if (window.xkiller) {
    theme = await window.xkiller.getTheme();
  } else {
    try {
      const saved = localStorage.getItem('xkiller-theme');
      if (isTheme(saved)) theme = saved;
    } catch {
      /* Storage may be disabled; the system preference still works. */
    }
  }
  applyTheme(theme);
  return theme;
}

export async function saveTheme(theme: Theme) {
  if (window.xkiller) await window.xkiller.setTheme(theme);
  else localStorage.setItem('xkiller-theme', theme);
  applyTheme(theme);
}
