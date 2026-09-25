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
let serverFailed = false;
let serverLog = "";
let serverReady = false;
let everReady = false;
let quitting = false;
let serverRestarts = 0;
let healthTimer = null;
let healthGen = 0;

function prefsPath() {
  return path.join(app.getPath("userData"), "quire-prefs.json");
}

function serverDownMessage() {
  if (/EADDRINUSE|address already in use/i.test(serverLog)) {
    return `Quire could not start. Port ${PROD_PORT} is already in use.`;
  }
  return "Quire's local server stopped.";
}

function waitForUrl(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    let settled = false;
    const fail = (message) => {
      if (settled) return;
      settled = true;
      reject(new Error(message));
    };
    let waiting = false;
    const attempt = () => {
      if (settled || waiting) return;
      if (serverFailed || (serverChild && serverChild.exitCode !== null)) {
        fail(serverDownMessage());
        return;
      }
      if (Date.now() - started > timeoutMs) {
        fail("Quire took too long to start.");
        return;
      }
      const req = http.get(url, (res) => {
        res.resume();
        if (settled) return;
        settled = true;
        resolve();
      });
      req.setTimeout(2000, () => {
        req.destroy();
      });
      req.on("error", () => {
        if (settled || waiting) return;
        if (serverFailed || (serverChild && serverChild.exitCode !== null)) {
          fail(serverDownMessage());
          return;
        }
        if (Date.now() - started > timeoutMs) {
          fail("Quire took too long to start.");
          return;
        }
        waiting = true;
        setTimeout(() => {
          waiting = false;
          attempt();
        }, 250);
      });
    };
    attempt();
  });
}

function attachServer(child) {
  serverLog = "";
  if (child.stderr) {
    child.stderr.on("data", (chunk) => {
      serverLog = (serverLog + chunk.toString()).slice(-4000);
    });
  }
  child.on("error", (err) => {
    serverFailed = true;
    serverLog = `${serverLog}\n${err && err.message ? err.message : String(err)}`.slice(-4000);
    console.error("Failed to start Quire server:", err);
  });
  child.on("exit", () => {
    if (serverChild !== child) return;
    stopHealthWatch();
    serverFailed = true;
    const wasReady = serverReady;
    serverReady = false;
    if (quitting || !wasReady) return;
    if (serverRestarts >= 3) {
      dialog.showErrorBox("Quire", serverDownMessage());
      return;
    }
    serverRestarts += 1;
    setTimeout(() => {
      if (quitting) return;
      startPackagedServer()
        .then(() => {
          const win = BrowserWindow.getAllWindows()[0];
          if (win && !win.isDestroyed()) void win.loadURL(PROD_URL);
        })
        .catch(() => {
          /* the next exit decides whether to try again */
        });
    }, 400);
  });
}

function stopHealthWatch() {
  healthGen += 1;
  if (healthTimer) clearTimeout(healthTimer);
  healthTimer = null;
}

function startHealthWatch() {
  stopHealthWatch();
  const gen = healthGen;
  let misses = 0;
  const ping = () => {
    if (gen !== healthGen || quitting || !serverReady) return;
    const child = serverChild;
    if (!child || child.exitCode !== null) return;
    let done = false;
    const req = http.get(PROD_URL, (res) => {
      res.resume();
      if (done || gen !== healthGen) return;
      done = true;
      misses = 0;
      healthTimer = setTimeout(ping, 15000);
    });
    req.setTimeout(15000, () => {
      if (done || gen !== healthGen) return;
      done = true;
      misses += 1;
      req.destroy();
      if (misses >= 3 && serverChild && serverChild.exitCode === null && !serverChild.killed) {
        misses = 0;
        serverChild.kill();
        return;
      }
      healthTimer = setTimeout(ping, 1000);
    });
    req.on("error", () => {
      if (done || gen !== healthGen) return;
      done = true;
      misses += 1;
      if (misses >= 3 && serverChild && serverChild.exitCode === null && !serverChild.killed) {
        misses = 0;
        serverChild.kill();
        return;
      }
      healthTimer = setTimeout(ping, 1000);
    });
  };
  healthTimer = setTimeout(ping, 15000);
}

function startPackagedServer() {
  const serverJs = path.join(process.resourcesPath, "output", "server", "index.mjs");
  if (!fs.existsSync(serverJs)) {
    throw new Error("Quire server files are missing. Reinstall the app.");
  }
  serverFailed = false;
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
    stdio: ["ignore", "ignore", "pipe"],
    windowsHide: true,
  });
  attachServer(serverChild);
  return waitForUrl(PROD_URL, 60000).then(() => {
    serverReady = true;
    everReady = true;
    serverRestarts = 0;
    startHealthWatch();
  });
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
      spellcheck: true,
    },
  });
  win.once("ready-to-show", () => win.show());
  win.loadURL(url);
  win.webContents.setWindowOpenHandler(({ url: next }) => {
    // Match quire:open-external - http(s) only; deny file:/javascript:/etc.
    const href = String(next || "");
    if (/^https?:\/\//i.test(href)) {
      void shell.openExternal(href);
    }
    return { action: "deny" };
  });

  let flushing = false;
  win.on("close", (event) => {
    if (win.__quireAllowClose) return;
    event.preventDefault();
    if (flushing) return;
    const wc = win.webContents;
    if (!wc || wc.isDestroyed()) {
      win.__quireAllowClose = true;
      win.close();
      return;
    }
    flushing = true;
    let ask = () => {};
    let settled = false;
    const finish = () => {
      clearTimeout(timer);
      wc.removeListener("did-finish-load", ask);
      win.__quireAllowClose = true;
      flushing = false;
      if (!win.isDestroyed()) win.close();
    };
    const giveUp = (message) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      ipcMain.removeListener("quire:flush-done", onDone);
      wc.removeListener("did-finish-load", ask);
      dialog
        .showMessageBox(win, {
          type: "warning",
          title: "Quire",
          message,
          buttons: ["Keep Quire open", "Close anyway"],
          defaultId: 0,
          cancelId: 0,
          noLink: true,
        })
        .then((result) => {
          if (win.isDestroyed()) return;
          if (result.response === 1) finish();
          else flushing = false;
        })
        .catch(() => {
          flushing = false;
        });
    };
    const timer = setTimeout(
      () => giveUp("The page did not finish saving. A large desk can take a moment. Close anyway?"),
      20000,
    );
    const onDone = (_event, ok) => {
      if (settled) return;
      if (ok === false) {
        giveUp("The page did not finish saving. Close anyway?");
        return;
      }
      settled = true;
      clearTimeout(timer);
      ipcMain.removeListener("quire:flush-done", onDone);
      finish();
    };
    ipcMain.once("quire:flush-done", onDone);
    ask = () => {
      try {
        wc.send("quire:flush");
      } catch {
        giveUp("The page did not finish saving. Close anyway?");
      }
    };
    if (wc.isLoadingMainFrame()) wc.once("did-finish-load", ask);
    else ask();
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
      const tmp = `${file}.tmp`;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(tmp, JSON.stringify(prefs ?? {}), "utf8");
      fs.renameSync(tmp, file);
      return true;
    } catch (err) {
      console.error("Failed to write Quire prefs:", err);
      return false;
    }
  });
  ipcMain.handle("quire:add-spell-word", (event, word) => {
    const clean = String(word || "")
      .trim()
      .toLowerCase();
    if (!clean) return false;
    try {
      event.sender.session.addWordToSpellCheckerDictionary(clean);
      return true;
    } catch {
      return false;
    }
  });
  ipcMain.handle("quire:remove-spell-word", (event, word) => {
    const clean = String(word || "")
      .trim()
      .toLowerCase();
    if (!clean) return false;
    try {
      const session = event.sender.session;
      if (typeof session.removeWordFromSpellCheckerDictionary !== "function") return false;
      session.removeWordFromSpellCheckerDictionary(clean);
      return true;
    } catch {
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
    try {
      await startPackagedServer();
    } catch (err) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (serverChild && serverChild.exitCode === null) {
        const doomed = serverChild;
        serverChild = null;
        serverReady = false;
        try {
          doomed.kill();
        } catch {
          /* already gone */
        }
      }
      serverFailed = false;
      if (everReady) throw err;
      await startPackagedServer();
    }
    url = PROD_URL;
  }
  createWindow(url);
  setTimeout(() => {
    void maybeNotifyUpdate();
  }, 8000);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });

  app.whenReady().then(() => {
    boot().catch((err) => {
      dialog.showErrorBox("Quire", err?.message || String(err));
      app.quit();
    });
  });

  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => {
    quitting = true;
    stopHealthWatch();
    if (serverChild && !serverChild.killed) serverChild.kill();
  });
}
