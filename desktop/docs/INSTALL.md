# Installing AI Sales Pitch Evaluator (Desktop)

Download the latest installers from the
[GitHub Releases page](https://github.com/HarshGcode/ai-sales-pitch-evaluator/releases/latest).

## Windows

| File | What it is |
|---|---|
| `AI Sales Pitch Evaluator-Setup-X.Y.Z.exe` | Standard installer (recommended) — Start-menu + desktop shortcut, auto-updates |
| `AI Sales Pitch Evaluator-X.Y.Z-portable.exe` | Portable — run from anywhere (USB stick etc.), no install; portable builds do not auto-update |

1. Download the Setup `.exe` and run it.
2. If Windows SmartScreen shows "Windows protected your PC" (unsigned builds only):
   click **More info → Run anyway**.
3. Pick an install location and finish. The app launches automatically.

## macOS

| File | What it is |
|---|---|
| `AI Sales Pitch Evaluator-X.Y.Z-mac-universal.dmg` | Universal installer — runs natively on Apple Silicon (M1–M4) **and** Intel Macs |

1. Download the `.dmg` and open it.
2. Drag **AI Sales Pitch Evaluator** into the **Applications** folder.
3. First launch of an **unsigned** build: right-click the app in Applications →
   **Open** → **Open**. (Signed/notarized builds open normally.)
   If macOS still refuses, run: `xattr -cr "/Applications/AI Sales Pitch Evaluator.app"`
4. When you first record a pitch, macOS asks for microphone access — click **Allow**.
   (Manage later in System Settings → Privacy & Security → Microphone.)

## Signing in

Use the same email/password as the website. Your session is remembered across app
restarts until you log out.

## Updates

The app checks GitHub Releases on launch and every 4 hours. When a new version is
available you'll get a prompt: **Download → Restart now**. You can also check
manually via the app menu (macOS) / Help menu (Windows) → *Check for Updates…*

> Note: on macOS, automatic updates only work for signed builds. With unsigned
> builds, download the new `.dmg` manually.

## Uninstall

- **Windows:** Settings → Apps → AI Sales Pitch Evaluator → Uninstall (your login
  session and settings are kept unless you delete `%AppData%\ai-sales-pitch-evaluator-desktop`).
- **macOS:** drag the app from Applications to Trash
  (settings live in `~/Library/Application Support/ai-sales-pitch-evaluator-desktop`).
