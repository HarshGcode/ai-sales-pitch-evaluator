// Central configuration for the desktop shell.
//
// The desktop app loads the deployed web frontend (Vercel), which proxies
// /api/* to the Railway backend from its own origin — so the auth cookie is
// always first-party and login works identically to the browser.
const PROD_URL = "https://frontend-one-man-code.vercel.app";
const DEV_URL = "http://localhost:3000";

const isDev = process.argv.includes("--dev") || process.env.APP_ENV === "development";

// Override order: explicit env var > --url= CLI flag > dev/prod default.
const cliUrl = process.argv.find((a) => a.startsWith("--url="))?.slice("--url=".length);
const appUrl = process.env.APP_URL || cliUrl || (isDev ? DEV_URL : PROD_URL);

module.exports = {
  isDev,
  appUrl,
  appOrigin: new URL(appUrl).origin,
  repoUrl: "https://github.com/HarshGcode/ai-sales-pitch-evaluator",
};
