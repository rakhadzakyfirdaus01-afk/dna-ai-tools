const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");

// Production URL (or local development)
const TARGET_URL = process.env.ELECTRON_URL || "https://dna-ai-tools.vercel.app";

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 680,
    title: "DNA AI Platform",
    icon: path.join(__dirname, "../public/icon-512.png"),
    backgroundColor: "#020617",
    show: false,

    // Sembunyikan menu bar tradisional (File, Edit, View, dll)
    autoHideMenuBar: true,

    // Tampilan modern Windows frameless overlay:
    // Menghilangkan semua ikon browser Chrome (titik 3, open in tab, dll)
    // Hanya menampilkan tombol minimize, maximize, close asli Windows yang menyatu elegan dengan tema gelap
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0F172A",
      symbolColor: "#94A3B8",
      height: 38,
    },

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      spellcheck: false,
    },
  });

  // Tampilkan jendela setelah siap agar tidak berkedip putih
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Buka URL DNA AI
  mainWindow.loadURL(TARGET_URL);

  // Buka link eksternal (di luar DNA AI) di browser bawaan komputer
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes("dna-ai") || url.includes("vercel.app") || url.startsWith("http://localhost")) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Pintasan Keyboard: F11 untuk Fullscreen, Ctrl+R untuk Reload
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F11" && input.type === "keyDown") {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
    if ((input.control || input.meta) && input.key.toLowerCase() === "r" && input.type === "keyDown") {
      mainWindow.reload();
      event.preventDefault();
    }
  });
}

// Inisialisasi Aplikasi Electron
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Tutup aplikasi saat semua jendela ditutup (Windows & Linux)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
