const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const SAVE_FILE = path.join(app.getPath('userData'), 'career-save.json');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0b0d10',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('save-game', async (_event, data) => {
  try {
    fs.writeFileSync(SAVE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('load-game', async () => {
  try {
    if (!fs.existsSync(SAVE_FILE)) return { ok: true, data: null };
    const raw = fs.readFileSync(SAVE_FILE, 'utf-8');
    return { ok: true, data: JSON.parse(raw) };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('delete-save', async () => {
  try {
    if (fs.existsSync(SAVE_FILE)) fs.unlinkSync(SAVE_FILE);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});
