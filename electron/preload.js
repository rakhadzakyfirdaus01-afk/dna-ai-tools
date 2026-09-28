const { contextBridge } = require("electron");

// Ekspos info aman ke lingkungan renderer jika dibutuhkan
contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,
});
