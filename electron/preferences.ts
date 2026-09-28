import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { isTheme, type Theme } from '../src/lib/theme';

export async function readTheme(directory: string, fallback: Theme): Promise<Theme> {
  try {
    const value = JSON.parse(await readFile(join(directory, 'preferences.json'), 'utf8'));
    return isTheme(value?.theme) ? value.theme : fallback;
  } catch {
    return fallback;
  }
}

export async function writeTheme(directory: string, theme: unknown): Promise<Theme> {
  if (!isTheme(theme)) throw new Error('Invalid theme');
  await mkdir(directory, { recursive: true });
  const file = join(directory, 'preferences.json');
  await writeFile(file + '.tmp', JSON.stringify({ theme }) + '\n', 'utf8');
  await rename(file + '.tmp', file);
  return theme;
}
