const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("quire", {
  version: () => ipcRenderer.invoke("quire:version"),
  openExternal: (url) => ipcRenderer.invoke("quire:open-external", url),
  checkUpdates: () => ipcRenderer.invoke("quire:check-updates"),
});
