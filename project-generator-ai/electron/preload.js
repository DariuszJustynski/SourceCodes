const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  runAudit: (payload) => ipcRenderer.invoke('audit:run', payload),
  loadProject: (payload) => ipcRenderer.invoke('project:load', payload)
});
