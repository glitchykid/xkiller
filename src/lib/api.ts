export async function request<T>(action: string, payload?: unknown): Promise<T> {
  // Svelte's reactive objects are proxies, which Electron's structured clone cannot cross.
  const plainPayload = payload === undefined ? undefined : JSON.parse(JSON.stringify(payload));
  if (window.xkiller) return (await window.xkiller.request(action, plainPayload)) as T;
  const response = await fetch('/api/' + action, {
    method: action === 'state' || action.startsWith('export/') ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Service unavailable' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}
export async function exportFile(kind: string) {
  if (window.xkiller) return window.xkiller.export(kind);
  const file = await request<{ filename: string; content: string; mime: string }>('export/' + kind);
  const url = URL.createObjectURL(new Blob([file.content], { type: file.mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = file.filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
