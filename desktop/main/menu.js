// Native application menu with standard roles + app-specific shortcuts.
const { app, Menu, shell, nativeTheme } = require("electron");
const config = require("./config");
const store = require("./store");
const updater = require("./updater");

function themeItem(label, source) {
  return {
    label,
    type: "radio",
    checked: nativeTheme.themeSource === source,
    click: () => {
      nativeTheme.themeSource = source;
      store.set("theme", source);
    },
  };
}

function build(getWindow) {
  const isMac = process.platform === "darwin";
  const wc = () => getWindow()?.webContents;

  const template = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { label: "Check for Updates…", click: () => updater.checkNow() },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "Go Home",
          accelerator: "CmdOrCtrl+Shift+H",
          click: () => wc()?.loadURL(config.appUrl),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Back",
          accelerator: isMac ? "Cmd+[" : "Alt+Left",
          click: () => {
            const w = wc();
            if (w?.navigationHistory.canGoBack()) w.navigationHistory.goBack();
          },
        },
        {
          label: "Forward",
          accelerator: isMac ? "Cmd+]" : "Alt+Right",
          click: () => {
            const w = wc();
            if (w?.navigationHistory.canGoForward()) w.navigationHistory.goForward();
          },
        },
        { type: "separator" },
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        {
          label: "Appearance",
          submenu: [
            themeItem("System", "system"),
            themeItem("Light", "light"),
            themeItem("Dark", "dark"),
          ],
        },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(config.isDev ? [{ type: "separator" }, { role: "toggleDevTools" }] : []),
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        {
          label: "Minimize to Tray on Close",
          type: "checkbox",
          checked: store.get("closeToTray", false),
          click: (item) => store.set("closeToTray", item.checked),
        },
        ...(isMac
          ? [{ type: "separator" }, { role: "front" }]
          : [{ role: "close" }]),
      ],
    },
    {
      role: "help",
      submenu: [
        {
          label: "Open in Browser",
          click: () => shell.openExternal(config.appUrl),
        },
        {
          label: "GitHub Repository",
          click: () => shell.openExternal(config.repoUrl),
        },
        {
          label: "Report an Issue",
          click: () => shell.openExternal(`${config.repoUrl}/issues/new`),
        },
        { type: "separator" },
        ...(isMac
          ? []
          : [{ label: "Check for Updates…", click: () => updater.checkNow() }]),
        { label: `Version ${app.getVersion()}`, enabled: false },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { build };
