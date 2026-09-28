import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('xkiller', {
  request: (action: string, payload?: unknown) =>
    ipcRenderer.invoke('lab:request', action, payload),
  export: (kind: string) => ipcRenderer.invoke('lab:export', kind),
  getPreferences: () => ipcRenderer.invoke('preferences:get'),
  setPreferences: (value: unknown) => ipcRenderer.invoke('preferences:set', value),
});
