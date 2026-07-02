// Persist and restore window bounds + maximized state across launches.
const { screen } = require("electron");
const store = require("./store");

const KEY = "windowState";
const DEFAULTS = { width: 1280, height: 800 };

function restore() {
  const saved = store.get(KEY);
  if (!saved || !saved.width || !saved.height) return { ...DEFAULTS };

  // Only reuse saved bounds if they are still (mostly) on a connected display,
  // e.g. an external monitor may have been unplugged since last run.
  const visible = screen.getAllDisplays().some((d) => {
    const a = d.workArea;
    return (
      saved.x >= a.x - 100 &&
      saved.y >= a.y - 100 &&
      saved.x < a.x + a.width &&
      saved.y < a.y + a.height
    );
  });
  return visible ? saved : { width: saved.width, height: saved.height };
}

function track(win) {
  let timer = null;

  const save = () => {
    if (win.isDestroyed()) return;
    const maximized = win.isMaximized();
    // Don't overwrite the normal bounds with maximized/fullscreen bounds.
    const bounds = maximized || win.isFullScreen() ? store.get(KEY, {}) : win.getBounds();
    store.set(KEY, { ...bounds, maximized });
  };

  const debounced = () => {
    clearTimeout(timer);
    timer = setTimeout(save, 400);
  };

  win.on("resize", debounced);
  win.on("move", debounced);
  win.on("close", save);
}

module.exports = { restore, track, DEFAULTS };
