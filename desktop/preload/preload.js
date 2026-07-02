// Preload: the only bridge between the (remote) web app and the desktop shell.
// Context isolation is on and node integration is off, so the page can reach
// exactly what is exposed here — nothing else.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  /** True whenever the app runs inside the desktop shell. */
  isDesktop: true,
  platform: process.platform,

  /** Desktop app version (semver, matches the GitHub release tag). */
  getVersion: () => ipcRenderer.invoke("app:version"),

  /** Show a native OS notification. */
  notify: (title, body) =>
    ipcRenderer.invoke("app:notify", { title: String(title), body: String(body ?? "") }),

  /** Manually trigger an update check (auto-check also runs periodically). */
  checkForUpdates: () => ipcRenderer.invoke("updates:check"),

  /** Badge count on the dock/taskbar icon (0 clears it). */
  setBadgeCount: (n) => ipcRenderer.invoke("app:badge", Number(n) || 0),
});
