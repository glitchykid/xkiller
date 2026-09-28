import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { normalizePreferences, validatePreferences, type Preferences } from '../shared/preferences';

export async function readPreferences(
  directory: string,
  fallback: Preferences,
): Promise<Preferences> {
  try {
    return normalizePreferences(
      JSON.parse(await readFile(join(directory, 'preferences.json'), 'utf8')),
      fallback,
    );
  } catch {
    return fallback;
  }
}
export async function writePreferences(directory: string, value: unknown): Promise<Preferences> {
  const preferences = validatePreferences(value);
  await mkdir(directory, { recursive: true });
  const file = join(directory, 'preferences.json');
  await writeFile(file + '.tmp', JSON.stringify(preferences) + '\n', 'utf8');
  await rename(file + '.tmp', file);
  return preferences;
}
