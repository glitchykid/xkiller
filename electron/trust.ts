import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function canonicalDocument(rawUrl: string): string {
  const url = new URL(rawUrl);
  if (url.protocol !== 'file:' || url.hostname || url.search || url.hash) {
    throw new Error('Unexpected document URL');
  }
  const filePath = fileURLToPath(url);
  if (process.platform === 'win32' && !/^[a-z]:\\/i.test(filePath)) {
    throw new Error('Network paths are not application documents');
  }
  // NSIS may load Chromium from an 8.3 path while Node resolves its long-path alias.
  // Canonicalize the real archive, then retain the exact virtual document path inside it.
  const archive = /^(.*?\.asar)([\\/].*)$/i.exec(filePath);
  const canonical = realpathSync.native(archive ? archive[1] : filePath) + (archive?.[2] ?? '');
  return process.platform === 'win32' ? canonical.toLowerCase() : canonical;
}

export function isTrustedDocument(candidate: string, expected: string): boolean {
  if (expected === 'http://127.0.0.1:5173') {
    return candidate === expected || candidate === expected + '/';
  }
  try {
    return canonicalDocument(candidate) === canonicalDocument(expected);
  } catch {
    return false;
  }
}
