// Shared boot recipe for the benefactor.cc marketing-site browser E2E.
//
// This repo is the *built* GitHub Pages output (the HTML is committed, there is
// no Astro build step here), so the harness serves the repo root as a static
// site over an ephemeral port and drives the committed pages directly. That
// keeps the browser specs testing exactly the bytes GitHub Pages will publish.
//
// Both the Puppeteer and Playwright specs share one Chrome binary via
// `chromeExecutablePath()` so CI needs only a single browser install.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Repo root is one level up from tests/.
export const siteRoot = fileURLToPath(new URL("..", import.meta.url));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

// Resolve a request path to a file on disk the way GitHub Pages does:
// `/team/` -> `/team/index.html`, `/` -> `/index.html`, and a bare directory
// path (no trailing slash) still resolves to its index.html. Guards against
// path traversal by confining every resolved path under siteRoot.
async function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const rel = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  let abs = path.join(siteRoot, rel);
  if (!abs.startsWith(siteRoot)) return null; // traversal attempt

  try {
    const s = await stat(abs);
    if (s.isDirectory()) abs = path.join(abs, "index.html");
  } catch {
    if (existsSync(abs + ".html")) abs = abs + ".html";
    else if (existsSync(path.join(abs, "index.html"))) abs = path.join(abs, "index.html");
  }
  return existsSync(abs) && !abs.endsWith(path.sep) ? abs : null;
}

// Boots a static file server for the committed site on an ephemeral port and
// resolves once it is listening. Set BENEFACTOR_SITE_URL to run the specs
// against an already-running site (e.g. the live https://benefactor.cc) instead.
export function startSite() {
  const reuse = process.env.BENEFACTOR_SITE_URL;
  if (reuse) {
    return Promise.resolve({ url: reuse.replace(/\/+$/, ""), stop: () => {} });
  }

  const server = createServer(async (req, res) => {
    try {
      const file = await resolveFile(req.url ?? "/");
      if (!file) {
        res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
        res.end("<!doctype html><title>404</title>not found");
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
      res.end(body);
    } catch (err) {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end(String(err));
    }
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        stop: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

// One Chrome for both engines. CI (setup-chrome) exports CHROME_BIN; locally we
// fall back to a bundled Puppeteer/Playwright Chromium or the system Chrome.
export function chromeExecutablePath() {
  const fromEnv =
    process.env.CHROME_BIN ||
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return undefined; // let the engine fall back to its own bundled browser
}

// Chrome flags CI needs (sandbox is unavailable in the Actions container).
export const chromeArgs =
  process.env.CI === "true" ? ["--no-sandbox", "--disable-setuid-sandbox"] : [];
