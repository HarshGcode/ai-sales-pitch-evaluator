// System tray icon with quick actions. On macOS this lives in the menu bar
// (template image adapts to light/dark); on Windows in the notification area.
const { app, Tray, Menu, nativeImage } = require("electron");
const path = require("path");
const updater = require("./updater");

let tray = null; // keep a global ref or the tray gets garbage-collected

function create(getWindow) {
  const iconName =
    process.platform === "darwin" ? "trayTemplate.png" : "tray.png";
  const icon = nativeImage.createFromPath(
    path.join(__dirname, "..", "build", "tray", iconName)
  );

  tray = new Tray(icon);
  tray.setToolTip("AI Sales Pitch Evaluator");

  const show = () => {
    const win = getWindow();
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  };

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open AI Sales Pitch Evaluator", click: show },
      { type: "separator" },
      { label: "Check for Updates…", click: () => updater.checkNow() },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ])
  );

  // Windows convention: single-click opens the app.
  tray.on("click", () => {
    if (process.platform !== "darwin") show();
  });

  return tray;
}

module.exports = { create };
