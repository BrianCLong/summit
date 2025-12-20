import {contextBridge, ipcRenderer} from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Store operations
  storeGet: (key: string) => ipcRenderer.invoke('store-get', key),
  storeSet: (key: string, value: any) => ipcRenderer.invoke('store-set', key, value),
  storeDelete: (key: string) => ipcRenderer.invoke('store-delete', key),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // External links
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  // Dialogs
  showSaveDialog: (options: Electron.SaveDialogOptions) =>
    ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options: Electron.OpenDialogOptions) =>
    ipcRenderer.invoke('show-open-dialog', options),

  // Event listeners
  onMenuNewCase: (callback: () => void) => {
    ipcRenderer.on('menu-new-case', callback);
  },
  onDeepLink: (callback: (url: string) => void) => {
    ipcRenderer.on('deep-link', (_event, url) => callback(url));
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Platform info
contextBridge.exposeInMainWorld('platform', {
  isElectron: true,
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',
});

// Type definitions for window
declare global {
  interface Window {
    electronAPI: {
      storeGet: (key: string) => Promise<any>;
      storeSet: (key: string, value: any) => Promise<void>;
      storeDelete: (key: string) => Promise<void>;
      getAppVersion: () => Promise<string>;
      openExternal: (url: string) => Promise<void>;
      showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;
      showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
      onMenuNewCase: (callback: () => void) => void;
      onDeepLink: (callback: (url: string) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
    platform: {
      isElectron: boolean;
      isMac: boolean;
      isWindows: boolean;
      isLinux: boolean;
    };
  }
}
