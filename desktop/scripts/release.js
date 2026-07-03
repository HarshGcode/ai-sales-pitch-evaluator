// Release helper: bumps the desktop app's semver, commits, tags vX.Y.Z and
// pushes — which triggers .github/workflows/desktop-release.yml to build the
// Windows/macOS installers and publish them as GitHub Release assets.
//
// Usage (from the repo root):
//   npm run release:patch   # 1.0.0 -> 1.0.1  (fixes)
//   npm run release:minor   # 1.0.0 -> 1.1.0  (features)
//   npm run release:major   # 1.0.0 -> 2.0.0  (breaking)
const { execSync } = require("child_process");
const path = require("path");

const bump = process.argv[2];
if (!["patch", "minor", "major"].includes(bump)) {
  console.error("Usage: node desktop/scripts/release.js <patch|minor|major>");
  process.exit(1);
}

const desktopDir = path.join(__dirname, "..");
const run = (cmd, opts = {}) =>
  execSync(cmd, { stdio: "inherit", ...opts });

const out = execSync("git status --porcelain").toString().trim();
if (out) {
  console.error("Working tree is not clean — commit or stash changes first.");
  process.exit(1);
}

// Bump version in desktop/package.json only (no tag yet — npm would refuse
// to tag from a subdirectory anyway).
execSync(`npm version ${bump} --no-git-tag-version`, { cwd: desktopDir });
const version = require(path.join(desktopDir, "package.json")).version;
const tag = `v${version}`;

run(`git add "${path.join(desktopDir, "package.json")}"`);
try {
  run(`git add "${path.join(desktopDir, "package-lock.json")}"`);
} catch {
  /* lockfile may be unchanged */
}
run(`git commit -m "Release ${tag}"`);
run(`git tag ${tag}`);
// Push the tag explicitly: --follow-tags only pushes annotated tags, and
// `git tag` creates a lightweight one, so the workflow would never trigger.
run(`git push origin HEAD refs/tags/${tag}`);

console.log(`\nTagged and pushed ${tag}.`);
console.log(
  "GitHub Actions is now building the installers — watch the run at:\n" +
    "https://github.com/HarshGcode/ai-sales-pitch-evaluator/actions"
);
