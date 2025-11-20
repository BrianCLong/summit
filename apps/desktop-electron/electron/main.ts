import {app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, shell, dialog} from 'electron';
import {autoUpdater} from 'electron-updater';
import Store from 'electron-store';
import log from 'electron-log';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize store for persistent data
const store = new Store();

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Development mode check
const isDev = process.env.NODE_ENV === 'development';
const isMac = process.platform === 'darwin';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Create main window
function createWindow() {
  const windowState = store.get('windowState', {
    width: 1400,
    height: 900,
    x: undefined,
    y: undefined,
    maximized: false,
  }) as any;

  mainWindow = new BrowserWindow({
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
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    icon: path.join(__dirname, '../build/icon.png'),
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
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({url}) => {
    shell.openExternal(url);
    return {action: 'deny'};
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
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              {role: 'about' as const},
              {type: 'separator' as const},
              {role: 'services' as const},
              {type: 'separator' as const},
              {role: 'hide' as const},
              {role: 'hideOthers' as const},
              {role: 'unhide' as const},
              {type: 'separator' as const},
              {role: 'quit' as const},
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
        {type: 'separator'},
        isMac ? {role: 'close'} : {role: 'quit'},
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {role: 'undo'},
        {role: 'redo'},
        {type: 'separator'},
        {role: 'cut'},
        {role: 'copy'},
        {role: 'paste'},
        ...(isMac
          ? [
              {role: 'pasteAndMatchStyle' as const},
              {role: 'delete' as const},
              {role: 'selectAll' as const},
            ]
          : [{role: 'delete' as const}, {type: 'separator' as const}, {role: 'selectAll' as const}]),
      ],
    },
    {
      label: 'View',
      submenu: [
        {role: 'reload'},
        {role: 'forceReload'},
        {role: 'toggleDevTools'},
        {type: 'separator'},
        {role: 'resetZoom'},
        {role: 'zoomIn'},
        {role: 'zoomOut'},
        {type: 'separator'},
        {role: 'togglefullscreen'},
      ],
    },
    {
      label: 'Window',
      submenu: [
        {role: 'minimize'},
        {role: 'zoom'},
        ...(isMac
          ? [{type: 'separator' as const}, {role: 'front' as const}, {type: 'separator' as const}, {role: 'window' as const}]
          : [{role: 'close' as const}]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://docs.intelgraph.com');
          },
        },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal('https://github.com/intelgraph/summit/issues');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Create system tray
function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '../build/tray-icon.png'));
  tray = new Tray(icon.resize({width: 16, height: 16}));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show IntelGraph',
      click: () => {
        mainWindow?.show();
      },
    },
    {type: 'separator'},
    {
      label: 'Quit',
      click: () => {
        app.quit();
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
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: 'A new version of IntelGraph is available. It will be downloaded in the background.',
      buttons: ['OK'],
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'A new version has been downloaded. Restart the application to apply the updates.',
        buttons: ['Restart', 'Later'],
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });
}

// IPC handlers
ipcMain.handle('store-get', (_event, key: string) => {
  return store.get(key);
});

ipcMain.handle('store-set', (_event, key: string, value: any) => {
  store.set(key, value);
});

ipcMain.handle('store-delete', (_event, key: string) => {
  store.delete(key);
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('open-external', (_event, url: string) => {
  return shell.openExternal(url);
});

ipcMain.handle('show-save-dialog', async (_event, options: Electron.SaveDialogOptions) => {
  const result = await dialog.showSaveDialog(mainWindow!, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (_event, options: Electron.OpenDialogOptions) => {
  const result = await dialog.showOpenDialog(mainWindow!, options);
  return result;
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

// Handle deep links
app.setAsDefaultProtocolClient('intelgraph');

app.on('open-url', (event, url) => {
  event.preventDefault();
  // Handle deep link URL
  console.log('Deep link:', url);
  mainWindow?.webContents.send('deep-link', url);
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
