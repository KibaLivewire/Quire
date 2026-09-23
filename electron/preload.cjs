const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("quire", {
  version: () => ipcRenderer.invoke("quire:version"),
  openExternal: (url) => ipcRenderer.invoke("quire:open-external", url),
  checkUpdates: () => ipcRenderer.invoke("quire:check-updates"),
  readPrefs: () => ipcRenderer.invoke("quire:prefs-read"),
  writePrefs: (prefs) => ipcRenderer.invoke("quire:prefs-write", prefs),
  onFlushRequest: (handler) => {
    const listener = () => {
      void Promise.resolve(handler());
    };
    ipcRenderer.on("quire:flush", listener);
    return () => ipcRenderer.removeListener("quire:flush", listener);
  },
  notifyFlushDone: () => ipcRenderer.send("quire:flush-done"),
  addSpellWord: (word) => ipcRenderer.invoke("quire:add-spell-word", word),
  removeSpellWord: (word) => ipcRenderer.invoke("quire:remove-spell-word", word),
});
