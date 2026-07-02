# Release Process (Desktop)

Releases follow **semantic versioning** (`MAJOR.MINOR.PATCH`) and are fully
automated: one command bumps the version, and CI builds + publishes the installers.

## Cut a release

From the **repo root**, on a clean `main`:

```bash
npm run release:patch   # bug fixes            1.0.0 -> 1.0.1
npm run release:minor   # new features         1.0.0 -> 1.1.0
npm run release:major   # breaking changes     1.0.0 -> 2.0.0
```

This (see `desktop/scripts/release.js`):

1. Bumps `version` in `desktop/package.json`
2. Commits `Release vX.Y.Z`, tags `vX.Y.Z`, pushes with `--follow-tags`
3. The tag triggers `.github/workflows/desktop-release.yml`, which builds on
   `macos-latest` and `windows-latest` and publishes to a GitHub Release:
   - `AI Sales Pitch Evaluator-Setup-X.Y.Z.exe` (Windows installer)
   - `AI Sales Pitch Evaluator-X.Y.Z-portable.exe` (Windows portable)
   - `AI Sales Pitch Evaluator-X.Y.Z-mac-universal.dmg` (macOS, Apple Silicon + Intel)
   - `.zip` + `latest*.yml` files (used by the auto-updater — don't delete these)

electron-builder creates the release as a **draft** the first time assets are
uploaded for a tag; open the Releases page, add notes, and click **Publish
release**. Installed apps worldwide then get the one-click update prompt.

## Auto-update flow (what users see)

`electron-updater` checks the repo's GitHub Releases on launch and every 4 hours
(repo is public, so no token is needed on the client):

1. "Version X.Y.Z is available — Download / Later"
2. Downloads in the background
3. "Update ready — Restart now / Later" (also installs on next quit)

## Code signing (optional but recommended)

Builds work unsigned, with caveats: Windows shows a SmartScreen warning, macOS
requires right-click → Open, and **macOS auto-update only works for signed apps**.
To sign, add these GitHub repository secrets (Settings → Secrets → Actions):

| Secret | Purpose |
|---|---|
| `WIN_CSC_LINK` | Windows: base64 of the `.pfx` certificate |
| `WIN_CSC_KEY_PASSWORD` | Windows: certificate password |
| `MAC_CSC_LINK` | macOS: base64 of the Developer ID Application `.p12` |
| `MAC_CSC_KEY_PASSWORD` | macOS: certificate password |
| `APPLE_ID` | macOS notarization: Apple ID email |
| `APPLE_APP_SPECIFIC_PASSWORD` | macOS notarization: app-specific password |
| `APPLE_TEAM_ID` | macOS notarization: team ID |

For macOS notarization, also flip `notarize: false` to `notarize: true` in
`desktop/electron-builder.yml`. The workflow already forwards all of these env
vars; unset secrets are simply ignored.

## Manual / local builds

```bash
cd desktop
npm ci
npm run build:mac   # on a Mac
npm run build:win   # on Windows
```

Artifacts land in `desktop/dist/`. To publish manually from a machine:
`GH_TOKEN=<personal access token> npm run release`.

## Versioning rules

- The git tag **must** equal `v` + `desktop/package.json` version — CI enforces
  this and fails the build otherwise. Always use the `npm run release:*` scripts.
- Never reuse or move a tag; cut a new patch release instead.
- The web frontend/backend deploy independently (Vercel/Railway) — desktop
  releases are only needed for shell changes.
