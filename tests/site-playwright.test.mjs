// Playwright browser E2E: serves the committed GitHub Pages output and asserts
// the rendered pages with role-based locators (a11y-aware), covering the home
// page, the case-studies page, the team roster, and the unsubscribe builder's
// default (no-query-param) behavior.
import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "playwright";
import { chromeArgs, chromeExecutablePath, startSite } from "./site-harness.mjs";

async function launch() {
  return chromium.launch({
    args: chromeArgs,
    executablePath: chromeExecutablePath(),
    headless: true,
  });
}

test("playwright renders the home hero and primary nav links", async (t) => {
  const server = await startSite();
  t.after(() => server.stop());
  const browser = await launch();
  t.after(() => browser.close());

  const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await page.goto(`${server.url}/`, { waitUntil: "networkidle" });
  assert.match(await page.title(), /^Benefactor - Search, Paid, and Automation/);

  const hero = page.getByRole("heading", { level: 1 });
  await hero.waitFor({ state: "visible" });
  assert.equal(
    (await hero.innerText()).replace(/\s+/g, " ").trim(),
    "Leaner funnels. Sharper intent. Compounding growth.",
  );

  // The standalone-page nav links must be visible and correctly targeted.
  for (const [name, href] of [
    ["Contact", "/contact/"],
    ["Case Studies", "/case-studies/"],
    ["Blogs", "/blogs/"],
  ]) {
    const link = page.getByRole("link", { name, exact: true }).first();
    await link.waitFor({ state: "visible" });
    assert.equal(await link.getAttribute("href"), href, `${name} points at the wrong href`);
  }
  assert.deepEqual(pageErrors, []);
});

test("playwright loads the case-studies page with a heading and no errors", async (t) => {
  const server = await startSite();
  t.after(() => server.stop());
  const browser = await launch();
  t.after(() => browser.close());

  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  const res = await page.goto(`${server.url}/case-studies/`, { waitUntil: "networkidle" });
  assert.equal(res.status(), 200);
  assert.match(await page.title(), /Case Studies \| Benefactor Marketing$/);
  await page.getByRole("heading", { level: 1 }).first().waitFor({ state: "visible" });
  assert.deepEqual(pageErrors, []);
});

test("playwright shows the team roster with multiple members", async (t) => {
  const server = await startSite();
  t.after(() => server.stop());
  const browser = await launch();
  t.after(() => browser.close());

  const page = await browser.newPage();
  await page.goto(`${server.url}/team/`, { waitUntil: "networkidle" });

  // The team page links each member's LinkedIn; there should be several, and
  // every outbound profile link must sever window.opener.
  const profiles = page.locator('a[target="_blank"]');
  const count = await profiles.count();
  assert.ok(count >= 3, `expected several team profile links, saw ${count}`);
  for (let i = 0; i < count; i++) {
    const rel = (await profiles.nth(i).getAttribute("rel")) ?? "";
    assert.match(rel, /noopener|noreferrer/, "team profile link missing opener protection");
  }
});

test("playwright unsubscribe falls back to default campaign/lead with no query", async (t) => {
  const server = await startSite();
  t.after(() => server.stop());
  const browser = await launch();
  t.after(() => browser.close());

  const page = await browser.newPage();
  // No query params -> the page's script uses its documented defaults.
  await page.goto(`${server.url}/unsubscribe/`, { waitUntil: "networkidle" });

  const href = await page.locator("#unsubscribe-link").getAttribute("href");
  assert.ok(href.startsWith("mailto:hello@benefactor.cc?subject=Unsubscribe&body="));
  const body = decodeURIComponent(href.split("body=")[1]);
  assert.match(body, /Campaign: benefactor-outreach/);
  assert.match(body, /Lead: not-provided/);
});
