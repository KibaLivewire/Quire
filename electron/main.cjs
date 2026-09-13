const { app, BrowserWindow, shell, dialog, ipcMain } = require("electron");
const { spawn } = require("node:child_process");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const DEV_URL = process.env.QUIRE_URL || "http://127.0.0.1:8080/";
const PROD_PORT = Number(process.env.QUIRE_PORT) || 4173;
const PROD_URL = `http://127.0.0.1:${PROD_PORT}/`;
const RELEASES = "https://api.github.com/repos/KibaLivewire/Quire/releases/latest";
const RELEASE_PAGE = "https://github.com/KibaLivewire/Quire/releases/latest";

let serverChild = null;

function prefsPath() {
  return path.join(app.getPath("userData"), "quire-prefs.json");
}

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

function iconPath() {
  const packed = path.join(__dirname, "icon.png");
  return fs.existsSync(packed) ? packed : undefined;
}

function createWindow(url) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: `Quire ${app.getVersion()}`,
    icon: iconPath(),
    backgroundColor: "#1a1714",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
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

  let flushing = false;
  win.on("close", (event) => {
    if (flushing || win.__quireAllowClose) return;
    const wc = win.webContents;
    if (!wc || wc.isDestroyed() || wc.isLoadingMainFrame()) {
      return;
    }
    event.preventDefault();
    flushing = true;
    const finish = () => {
      win.__quireAllowClose = true;
      flushing = false;
      if (!win.isDestroyed()) win.close();
    };
    const timer = setTimeout(finish, 2500);
    const onDone = () => {
      clearTimeout(timer);
      ipcMain.removeListener("quire:flush-done", onDone);
      finish();
    };
    ipcMain.once("quire:flush-done", onDone);
    try {
      wc.send("quire:flush");
    } catch {
      clearTimeout(timer);
      ipcMain.removeListener("quire:flush-done", onDone);
      finish();
    }
  });
}

function parseVersion(tag) {
  return String(tag || "")
    .trim()
    .replace(/^v/i, "");
}

function isNewer(latest, current) {
  const a = parseVersion(latest).split(".").map((n) => Number(n) || 0);
  const b = parseVersion(current).split(".").map((n) => Number(n) || 0);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}

async function lookupLatest() {
  const current = app.getVersion();
  const response = await fetch(RELEASES, {
    headers: { "User-Agent": "Quire", Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    return { current, latest: null, error: "Could not reach GitHub Releases. Make the repo public to enable updates." };
  }
  const data = await response.json();
  const latest = parseVersion(data.tag_name);
  return { current, latest, url: data.html_url || RELEASE_PAGE };
}

function wireIpc() {
  ipcMain.handle("quire:version", () => app.getVersion());
  ipcMain.handle("quire:open-external", async (_event, url) => {
    const href = String(url || "");
    if (!/^https?:\/\//i.test(href)) return;
    await shell.openExternal(href);
  });
  ipcMain.handle("quire:check-updates", async () => lookupLatest());
  ipcMain.handle("quire:prefs-read", () => {
    try {
      const raw = fs.readFileSync(prefsPath(), "utf8");
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  });
  ipcMain.handle("quire:prefs-write", (_event, prefs) => {
    try {
      const file = prefsPath();
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(prefs ?? {}), "utf8");
      return true;
    } catch (err) {
      console.error("Failed to write Quire prefs:", err);
      return false;
    }
  });
}

async function maybeNotifyUpdate() {
  if (!app.isPackaged) return;
  try {
    const info = await lookupLatest();
    if (!info.latest || !isNewer(info.latest, info.current)) return;
    const result = await dialog.showMessageBox({
      type: "info",
      title: "Quire",
      message: `Quire ${info.latest} is available.`,
      detail: `You have ${info.current}. Open the download page?`,
      buttons: ["Open download", "Later"],
      defaultId: 0,
      cancelId: 1,
    });
    if (result.response === 0) await shell.openExternal(info.url || RELEASE_PAGE);
  } catch {
    /* offline is fine */
  }
}

async function boot() {
  wireIpc();
  let url = DEV_URL;
  if (app.isPackaged) {
    await startPackagedServer();
    url = PROD_URL;
  }
  createWindow(url);
  setTimeout(() => {
    void maybeNotifyUpdate();
  }, 8000);
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
