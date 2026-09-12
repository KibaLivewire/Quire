const { app, BrowserWindow, shell, dialog } = require("electron");
const { spawn } = require("node:child_process");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const DEV_URL = process.env.QUIRE_URL || "http://127.0.0.1:8080/";
const PROD_PORT = Number(process.env.QUIRE_PORT) || 4173;
const PROD_URL = `http://127.0.0.1:${PROD_PORT}/`;

let serverChild = null;

function waitForUrl(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error("Quire took too long to start."));
          return;
        }
        setTimeout(attempt, 250);
      });
    };
    attempt();
  });
}

function startPackagedServer() {
  const serverJs = path.join(process.resourcesPath, "output", "server", "index.mjs");
  if (!fs.existsSync(serverJs)) {
    throw new Error("Quire server files are missing. Reinstall the app.");
  }
  serverChild = spawn(process.execPath, [serverJs], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(PROD_PORT),
      NITRO_PORT: String(PROD_PORT),
      HOST: "127.0.0.1",
      NITRO_HOST: "127.0.0.1",
      NODE_ENV: "production",
    },
    stdio: "ignore",
    windowsHide: true,
  });
  serverChild.on("error", (err) => {
    console.error("Failed to start Quire server:", err);
  });
  return waitForUrl(PROD_URL, 60000);
}

function createWindow(url) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Quire",
    backgroundColor: "#1a1714",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.once("ready-to-show", () => win.show());
  win.loadURL(url);
  win.webContents.setWindowOpenHandler(({ url: next }) => {
    void shell.openExternal(next);
    return { action: "deny" };
  });
}

async function boot() {
  let url = DEV_URL;
  if (app.isPackaged) {
    await startPackagedServer();
    url = PROD_URL;
  }
  createWindow(url);
}

app.whenReady().then(() => {
  boot().catch((err) => {
    dialog.showErrorBox("Quire", err?.message || String(err));
    app.quit();
  });
});

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  if (serverChild && !serverChild.killed) serverChild.kill();
});
