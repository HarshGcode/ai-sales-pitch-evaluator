// Main process for the AI Sales Pitch Evaluator desktop app.
//
// The renderer loads the deployed web frontend (which proxies /api/* to the
// Railway backend), so the shell's job is: security boundaries, native
// integration (menu/tray/notifications/shortcuts), session persistence,
// window state, splash, and auto-updates.
const {
  app,
  BrowserWindow,
  Notification,
  dialog,
  ipcMain,
  nativeTheme,
  session,
  shell,
  systemPreferences,
} = require("electron");
const path = require("path");
const config = require("./config");
const store = require("./store");
const windowState = require("./window-state");
const menu = require("./menu");
const tray = require("./tray");
const updater = require("./updater");

let mainWindow = null;
let splash = null;

// Windows: required for notifications + taskbar grouping to attribute correctly.
if (process.platform === "win32") {
  app.setAppUserModelId("com.harshgupta.aisalespitchevaluator");
}

// Single instance: launching the app again focuses the existing window.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
}

// Restore the user's theme choice (System / Light / Dark) before any window.
nativeTheme.themeSource = store.get("theme", "system");

function isAppOrigin(url) {
  try {
    const origin = new URL(url).origin;
    return origin === config.appOrigin || origin === "http://localhost:3000";
  } catch {
    return false;
  }
}

function createSplash() {
  splash = new BrowserWindow({
    width: 420,
    height: 320,
    frame: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: true,
    backgroundColor: "#0b0f1a",
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  splash.loadFile(path.join(__dirname, "splash.html"));
}

function createMainWindow() {
  const state = windowState.restore();

  mainWindow = new BrowserWindow({
    ...state,
    minWidth: 900,
    minHeight: 600,
    show: false, // shown when content is ready (splash covers the gap)
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0b0f1a" : "#ffffff",
    title: "AI Sales Pitch Evaluator",
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  windowState.track(mainWindow);
  if (state.maximized) mainWindow.maximize();

  mainWindow.loadURL(config.appUrl);

  mainWindow.once("ready-to-show", () => {
    splash?.destroy();
    splash = null;
    mainWindow.show();
  });

  // If the deployed site is unreachable (offline, Vercel protection, DNS…),
  // fail visibly instead of hanging behind the splash forever.
  mainWindow.webContents.on(
    "did-fail-load",
    (_e, code, description, url, isMainFrame) => {
      if (!isMainFrame || code === -3 /* aborted, e.g. redirects */) return;
      splash?.destroy();
      splash = null;
      mainWindow.show();
      dialog
        .showMessageBox(mainWindow, {
          type: "error",
          title: "Connection failed",
          message: "Could not reach the AI Sales Pitch Evaluator server.",
          detail: `${description} (${code})\n${url}\n\nCheck your internet connection, then retry.`,
          buttons: ["Retry", "Quit"],
          defaultId: 0,
        })
        .then(({ response }) => {
          if (response === 0) mainWindow.loadURL(config.appUrl);
          else app.quit();
        });
    }
  );

  // Any window.open / target=_blank to a foreign origin opens in the real
  // browser; same-origin links stay inside the app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppOrigin(url)) {
      mainWindow.loadURL(url);
    } else if (/^https?:/i.test(url)) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // Same rule for full navigations (e.g. <a href> without target).
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isAppOrigin(url)) return;
    event.preventDefault();
    if (/^https?:/i.test(url)) shell.openExternal(url);
  });

  // Minimize-to-tray (opt-in via Window menu): closing hides instead of quits.
  mainWindow.on("close", (event) => {
    if (app.isQuitting) return;
    if (store.get("closeToTray", false)) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function setupSession() {
  const ses = session.defaultSession;

  // Grant only what the app needs, and only to the app's own origin:
  // microphone (pitch recording), notifications, clipboard, fullscreen.
  const ALLOWED = new Set([
    "media",
    "notifications",
    "fullscreen",
    "clipboard-sanitized-write",
  ]);
  ses.setPermissionRequestHandler((wc, permission, callback, details) => {
    const requester = details.requestingUrl || wc.getURL();
    callback(ALLOWED.has(permission) && isAppOrigin(requester));
  });

  // macOS: trigger the OS-level microphone consent prompt up front so the
  // first in-app recording doesn't silently fail.
  if (process.platform === "darwin") {
    const status = systemPreferences.getMediaAccessStatus("microphone");
    if (status === "not-determined") {
      systemPreferences.askForMediaAccess("microphone").catch(() => {});
    }
  }
}

const getWindow = () => mainWindow;

// ---- IPC (invoked from the preload bridge only) ----
ipcMain.handle("app:version", () => app.getVersion());
ipcMain.handle("app:notify", (_e, { title, body }) => {
  if (Notification.isSupported()) new Notification({ title, body }).show();
});
ipcMain.handle("app:badge", (_e, count) => {
  app.setBadgeCount(count);
});
ipcMain.handle("updates:check", () => updater.checkNow());

app.on("before-quit", () => {
  app.isQuitting = true;
});

app.whenReady().then(() => {
  setupSession();
  createSplash();
  createMainWindow();
  menu.build(getWindow);
  tray.create(getWindow);
  updater.init(getWindow);
});

app.on("activate", () => {
  // macOS: re-open (or re-show) the window from the dock icon.
  if (mainWindow) mainWindow.show();
  else if (app.isReady()) createMainWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
