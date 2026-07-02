// Generates the platform icon formats from the single source of truth,
// build/icon.png (1024x1024):
//   build/icon.ico   – Windows (multi-size)
//   build/icon.icns  – macOS (multi-size)
// Tray PNGs live in build/tray/ and are committed directly.
//
// Usage: npm run icons  (from desktop/)
const fs = require("fs");
const path = require("path");
const png2icons = require("png2icons");

const buildDir = path.join(__dirname, "..", "build");
const source = path.join(buildDir, "icon.png");

if (!fs.existsSync(source)) {
  console.error(`Missing ${source} — add a 1024x1024 PNG first.`);
  process.exit(1);
}

const input = fs.readFileSync(source);

const icns = png2icons.createICNS(input, png2icons.BICUBIC, 0);
if (!icns) throw new Error("ICNS generation failed");
fs.writeFileSync(path.join(buildDir, "icon.icns"), icns);
console.log("wrote build/icon.icns");

const ico = png2icons.createICO(input, png2icons.BICUBIC, 0, false, true);
if (!ico) throw new Error("ICO generation failed");
fs.writeFileSync(path.join(buildDir, "icon.ico"), ico);
console.log("wrote build/icon.ico");
