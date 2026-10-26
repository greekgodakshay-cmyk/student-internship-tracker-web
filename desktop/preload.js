const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronDesktop', {
  isElectron: true,
  platform: process.platform,
  version: '1.0.0'
});
