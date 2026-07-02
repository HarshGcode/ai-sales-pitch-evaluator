// Auto-update via electron-updater + GitHub Releases.
//
// Publishing a new release (tag v*) makes every installed app offer a
// one-click update: notify -> download -> restart to install.
const { app, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const config = require("./config");

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // every 4 hours

let manualCheck = false;
let downloading = false;

// dialog.showMessageBox misparses a null parent, so only pass a real window.
function showBox(win, options) {
  return win && !win.isDestroyed()
    ? dialog.showMessageBox(win, options)
    : dialog.showMessageBox(options);
}

function init(getWindow) {
  if (!app.isPackaged) return; // never auto-update a dev build

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", async (info) => {
    if (downloading) return;
    const { response } = await showBox(getWindow(), {
      type: "info",
      title: "Update available",
      message: `Version ${info.version} is available (you have ${app.getVersion()}).`,
      detail: "Download it now? The update installs when you restart the app.",
      buttons: ["Download", "Later"],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) {
      downloading = true;
      autoUpdater.downloadUpdate().catch(() => {
        downloading = false;
      });
    }
  });

  autoUpdater.on("update-downloaded", async (info) => {
    downloading = false;
    const { response } = await showBox(getWindow(), {
      type: "info",
      title: "Update ready",
      message: `Version ${info.version} has been downloaded.`,
      detail: "Restart now to apply the update?",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });

  autoUpdater.on("update-not-available", () => {
    if (manualCheck) {
      showBox(getWindow(), {
        type: "info",
        title: "No updates",
        message: `You're on the latest version (${app.getVersion()}).`,
      });
    }
    manualCheck = false;
  });

  autoUpdater.on("error", (err) => {
    if (manualCheck) {
      showBox(getWindow(), {
        type: "warning",
        title: "Update check failed",
        message: "Could not check for updates.",
        detail: String(err?.message ?? err),
      });
    }
    manualCheck = false;
    downloading = false;
  });

  // First check shortly after launch, then periodically.
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10_000);
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), CHECK_INTERVAL_MS);
}

function checkNow() {
  if (!app.isPackaged) {
    dialog.showMessageBox({
      type: "info",
      title: "Updates",
      message: "Update checks only run in the packaged app.",
      detail: `This is a development build. Repo: ${config.repoUrl}`,
    });
    return;
  }
  manualCheck = true;
  autoUpdater.checkForUpdates().catch(() => {});
}

module.exports = { init, checkNow };
