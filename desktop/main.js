const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');

const TARGET_URL = process.env.LOCKED_IN_URL || 'https://student-internship-tracker-web.onrender.com/';
const ALLOWED_HOST = 'student-internship-tracker-web.onrender.com';

let mainWindow = null;

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Home',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            if (mainWindow) mainWindow.loadURL(TARGET_URL);
          }
        },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          }
        },
        {
          label: 'Clear Cache & Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: async () => {
            if (mainWindow) {
              await mainWindow.webContents.session.clearCache();
              mainWindow.loadURL(TARGET_URL);
            }
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit', label: 'Exit' }
      ]
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
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : [{ role: 'close' }])
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Visit Web App',
          click: () => {
            shell.openExternal(TARGET_URL);
          }
        },
        {
          label: 'GitHub Repository',
          click: () => {
            shell.openExternal('https://github.com/greekgodakshay-cmyk/student-internship-tracker-web');
          }
        },
        { type: 'separator' },
        {
          label: 'About Locked-In',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Locked-In',
              message: 'Locked-In — Student Internship & Skill Tracker',
              detail: 'Version 1.0.0 (Windows x64)\nA unified career workspace for learning, skills, projects, and internship opportunities.\n\nRunning on Electron & Chromium.',
              buttons: ['OK'],
              icon: path.join(__dirname, 'assets', 'icon.ico')
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'Locked-In — Student Internship & Skill Tracker',
    icon: iconPath,
    backgroundColor: '#f6f5f1',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  buildMenu();

  // Show window once ready to avoid visual flashing
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the production cloud application
  mainWindow.loadURL(TARGET_URL);

  // Handle load failures gracefully (offline or server sleeping)
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    // Ignore aborted loads (e.g. user navigation cancel)
    if (errorCode === -3) return;

    console.warn(`[Electron] Page failed to load: ${errorDescription} (${errorCode}) at ${validatedURL}`);
    const offlinePath = path.join(__dirname, 'offline.html');
    mainWindow.loadFile(offlinePath);
  });

  // Handle external links safely: open in user default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      const isInternal = parsed.hostname === ALLOWED_HOST ||
                         parsed.hostname === 'localhost' ||
                         parsed.hostname === '127.0.0.1';
      if (!isInternal) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    } catch (e) {
      // invalid URL
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url);
      const isInternal = parsed.hostname === ALLOWED_HOST ||
                         parsed.hostname === 'localhost' ||
                         parsed.hostname === '127.0.0.1';
      if (!isInternal && (parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch (e) {
      // ignore
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
