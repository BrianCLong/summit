"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Store operations
    storeGet: (key) => electron_1.ipcRenderer.invoke('store-get', key),
    storeSet: (key, value) => electron_1.ipcRenderer.invoke('store-set', key, value),
    storeDelete: (key) => electron_1.ipcRenderer.invoke('store-delete', key),
    // App info
    getAppVersion: () => electron_1.ipcRenderer.invoke('get-app-version'),
    // External links
    openExternal: (url) => electron_1.ipcRenderer.invoke('open-external', url),
    // Dialogs
    showSaveDialog: (options) => electron_1.ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => electron_1.ipcRenderer.invoke('show-open-dialog', options),
    // Event listeners
    onMenuNewCase: (callback) => {
        electron_1.ipcRenderer.on('menu-new-case', callback);
    },
    onDeepLink: (callback) => {
        electron_1.ipcRenderer.on('deep-link', (_event, url) => callback(url));
    },
    // Remove listeners
    removeAllListeners: (channel) => {
        electron_1.ipcRenderer.removeAllListeners(channel);
    },
});
// Platform info
electron_1.contextBridge.exposeInMainWorld('platform', {
    isElectron: true,
    isMac: process.platform === 'darwin',
    isWindows: process.platform === 'win32',
    isLinux: process.platform === 'linux',
});
