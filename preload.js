const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // You can add any IPC communication methods you need here
  onBackendMessage: (callback) => {
    ipcRenderer.on('backend-message', callback);
  },
  sendToBackend: (message) => {
    ipcRenderer.send('backend-message', message);
  }
});