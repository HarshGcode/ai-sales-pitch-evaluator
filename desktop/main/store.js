// Minimal JSON settings store (window bounds, tray preference, theme).
// Kept dependency-free on purpose: one file in userData, synchronous, tiny.
const { app } = require("electron");
const fs = require("fs");
const path = require("path");

const file = () => path.join(app.getPath("userData"), "settings.json");

let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(file(), "utf8"));
  } catch {
    cache = {};
  }
  return cache;
}

function get(key, fallback) {
  const value = load()[key];
  return value === undefined ? fallback : value;
}

function set(key, value) {
  const data = load();
  data[key] = value;
  try {
    fs.writeFileSync(file(), JSON.stringify(data, null, 2));
  } catch {
    // Non-fatal: settings just won't persist this run.
  }
}

module.exports = { get, set };
