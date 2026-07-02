# AI Sales Pitch Evaluator — Desktop App

Native desktop app for Windows and macOS, built with **Electron + electron-builder**.

It is a secure shell around the deployed web frontend (Vercel), which proxies all
`/api/*` calls to the FastAPI backend on Railway. That means:

- **No separate backend, no forked frontend** — the desktop app always runs the same
  code as the website, and web deploys reach desktop users instantly.
- **Login works identically**: the JWT auth cookie is first-party to the frontend
  origin, persists in Electron's cookie store across restarts (sessions are
  remembered), and logout works as usual.
- Shipping a new *desktop* version is only needed when the shell itself changes
  (menus, tray, updater…), not for app features.

## Why Electron (not Tauri)?

Tauri produces smaller binaries, but this app depends on in-browser **audio
recording** (`getUserMedia`/`MediaRecorder`) and file uploads. Electron bundles one
known Chromium version on both platforms, so recording behaves identically on
Windows and macOS; Tauri uses the OS webview (WKWebView / WebView2), which differs
in media-capture behavior. Electron also has the most mature cross-platform
auto-update story (`electron-updater` + GitHub Releases, no update server needed).
Since the UI is remote, the shell itself stays tiny and simple.

## Native features

| Feature | Where |
|---|---|
| Native menu bar + keyboard shortcuts | `main/menu.js` (Back/Forward, Go Home ⌘⇧H, zoom, fullscreen) |
| Tray icon (menu-bar icon on macOS) | `main/tray.js` |
| Minimize to tray on close (opt-in) | Window menu → "Minimize to Tray on Close" |
| Native notifications | Web `Notification` API + `window.desktop.notify()` bridge |
| Auto-updates from GitHub Releases | `main/updater.js` |
| Splash screen | `main/splash.html` |
| Window size/position persistence | `main/window-state.js` |
| Dark mode | View → Appearance (System / Light / Dark) |
| External links open in the default browser | `setWindowOpenHandler` + `will-navigate` guards |
| File upload / drag-and-drop / native file pickers | Standard web inputs — Electron shows native dialogs |
| Audio recording | Chromium `getUserMedia`; mic permission handled per-OS |
| Single-instance lock | Second launch focuses the existing window |

## Security

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- The renderer (remote web app) can only reach the tiny allow-listed API exposed in
  `preload/preload.js` (`window.desktop.*`) — no Node.js access.
- Permission requests (mic, notifications, fullscreen, clipboard) are granted **only
  to the app's own origin**; everything else is denied.
- Navigation to foreign origins is blocked and opened in the system browser instead.

## Develop

```bash
cd desktop
npm install
npm start            # loads the production frontend (Vercel)
npm run dev          # loads http://localhost:3000 (run the frontend dev server first)
APP_URL=https://staging.example.com npm start   # point at any deployment
```

Or from the repo root: `npm run desktop` / `npm run desktop:dev`.

## Build installers

```bash
cd desktop
npm run build:mac    # .dmg (universal: Apple Silicon + Intel) + .zip
npm run build:win    # NSIS .exe installer + portable .exe (x64)
npm run build        # both (cross-building win from mac requires wine; use CI instead)
```

Output lands in `desktop/dist/`. From the repo root: `npm run build:mac`, etc.

> macOS builds are unsigned unless signing env vars are set — see
> [docs/RELEASING.md](docs/RELEASING.md). Unsigned apps need right-click → Open on
> first launch, and **macOS auto-update requires a signed app**.

## Icons

`build/icon.png` (1024×1024) is the single source; `npm run icons` regenerates
`build/icon.ico` (Windows) and `build/icon.icns` (macOS) from it. Tray PNGs live in
`build/tray/`.

## Releases, CI/CD, versioning

See [docs/RELEASING.md](docs/RELEASING.md). Short version, from the repo root:

```bash
npm run release:patch   # or release:minor / release:major
```

That bumps the semver in `desktop/package.json`, commits, tags `vX.Y.Z`, and pushes.
GitHub Actions (`.github/workflows/desktop-release.yml`) then builds the Windows and
macOS installers and attaches them to a GitHub Release. Installed apps detect the new
release and offer a one-click update.

## Installation guide for end users

See [docs/INSTALL.md](docs/INSTALL.md).
