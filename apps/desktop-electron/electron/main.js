"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electron_updater_1 = require("electron-updater");
const electron_store_1 = __importDefault(require("electron-store"));
const electron_log_1 = __importDefault(require("electron-log"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
// Initialize store for persistent data
const store = new electron_store_1.default();
// Configure logging
electron_log_1.default.transports.file.level = 'info';
electron_updater_1.autoUpdater.logger = electron_log_1.default;
// Development mode check
const isDev = process.env.NODE_ENV === 'development';
const isMac = process.platform === 'darwin';
let mainWindow = null;
let tray = null;
// Create main window
function createWindow() {
    const windowState = store.get('windowState', {
        width: 1400,
        height: 900,
        x: undefined,
        y: undefined,
        maximized: false,
    });
    mainWindow = new electron_1.BrowserWindow({
        width: windowState.width,
        height: windowState.height,
        x: windowState.x,
        y: windowState.y,
        minWidth: 1024,
        minHeight: 768,
        show: false,
        backgroundColor: '#ffffff',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            preload: path_1.default.join(__dirname, 'preload.js'),
        },
        titleBarStyle: isMac ? 'hiddenInset' : 'default',
        icon: path_1.default.join(__dirname, '../build/icon.png'),
    });
    // Save window state
    mainWindow.on('close', () => {
        if (mainWindow) {
            const bounds = mainWindow.getBounds();
            store.set('windowState', {
                ...bounds,
                maximized: mainWindow.isMaximized(),
            });
        }
    });
    // Restore window state
    if (windowState.maximized) {
        mainWindow.maximize();
    }
    // Load URL
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
    // Create application menu
    createMenu();
    // Create system tray
    createTray();
    // Check for updates
    if (!isDev) {
        checkForUpdates();
    }
}
// Create application menu
function createMenu() {
    const template = [
        ...(isMac
            ? [
                {
                    label: electron_1.app.name,
                    submenu: [
                        { role: 'about' },
                        { type: 'separator' },
                        { role: 'services' },
                        { type: 'separator' },
                        { role: 'hide' },
                        { role: 'hideOthers' },
                        { role: 'unhide' },
                        { type: 'separator' },
                        { role: 'quit' },
                    ],
                },
            ]
            : []),
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Case',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow?.webContents.send('menu-new-case');
                    },
                },
                { type: 'separator' },
                isMac ? { role: 'close' } : { role: 'quit' },
            ],
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(isMac
                    ? [
                        { role: 'pasteAndMatchStyle' },
                        { role: 'delete' },
                        { role: 'selectAll' },
                    ]
                    : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
            ],
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
            ],
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(isMac
                    ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
                    : [{ role: 'close' }]),
            ],
        },
        {
            role: 'help',
            submenu: [
                {
                    label: 'Documentation',
                    click: async () => {
                        await electron_1.shell.openExternal('https://docs.intelgraph.com');
                    },
                },
                {
                    label: 'Report Issue',
                    click: async () => {
                        await electron_1.shell.openExternal('https://github.com/intelgraph/summit/issues');
                    },
                },
            ],
        },
    ];
    const menu = electron_1.Menu.buildFromTemplate(template);
    electron_1.Menu.setApplicationMenu(menu);
}
// Create system tray
function createTray() {
    const icon = electron_1.nativeImage.createFromPath(path_1.default.join(__dirname, '../build/tray-icon.png'));
    tray = new electron_1.Tray(icon.resize({ width: 16, height: 16 }));
    const contextMenu = electron_1.Menu.buildFromTemplate([
        {
            label: 'Show IntelGraph',
            click: () => {
                mainWindow?.show();
            },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                electron_1.app.quit();
            },
        },
    ]);
    tray.setToolTip('IntelGraph');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
        mainWindow?.show();
    });
}
// Auto-update functionality
function checkForUpdates() {
    electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
    electron_updater_1.autoUpdater.on('update-available', () => {
        electron_1.dialog.showMessageBox({
            type: 'info',
            title: 'Update Available',
            message: 'A new version of IntelGraph is available. It will be downloaded in the background.',
            buttons: ['OK'],
        });
    });
    electron_updater_1.autoUpdater.on('update-downloaded', () => {
        electron_1.dialog
            .showMessageBox({
            type: 'info',
            title: 'Update Ready',
            message: 'A new version has been downloaded. Restart the application to apply the updates.',
            buttons: ['Restart', 'Later'],
        })
            .then((result) => {
            if (result.response === 0) {
                electron_updater_1.autoUpdater.quitAndInstall();
            }
        });
    });
}
// IPC handlers
electron_1.ipcMain.handle('store-get', (_event, key) => {
    return store.get(key);
});
electron_1.ipcMain.handle('store-set', (_event, key, value) => {
    store.set(key, value);
});
electron_1.ipcMain.handle('store-delete', (_event, key) => {
    store.delete(key);
});
electron_1.ipcMain.handle('get-app-version', () => {
    return electron_1.app.getVersion();
});
electron_1.ipcMain.handle('open-external', (_event, url) => {
    return electron_1.shell.openExternal(url);
});
electron_1.ipcMain.handle('show-save-dialog', async (_event, options) => {
    const result = await electron_1.dialog.showSaveDialog(mainWindow, options);
    return result;
});
electron_1.ipcMain.handle('show-open-dialog', async (_event, options) => {
    const result = await electron_1.dialog.showOpenDialog(mainWindow, options);
    return result;
});
// App lifecycle
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (!isMac) {
        electron_1.app.quit();
    }
});
// Handle deep links
electron_1.app.setAsDefaultProtocolClient('intelgraph');
electron_1.app.on('open-url', (event, url) => {
    event.preventDefault();
    // Handle deep link URL
    console.log('Deep link:', url);
    mainWindow?.webContents.send('deep-link', url);
});
// Single instance lock
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
}
