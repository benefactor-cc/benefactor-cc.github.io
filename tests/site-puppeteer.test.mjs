// Puppeteer browser E2E: serves the committed GitHub Pages output and asserts
// the rendered pages load error-free with their real content, plus the one
// piece of client-side behavior on the site — the unsubscribe mailto builder.
import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";
import { chromeArgs, chromeExecutablePath, startSite } from "./site-harness.mjs";

async function launch() {
  return puppeteer.launch({
    args: chromeArgs,
    executablePath: chromeExecutablePath(),
    headless: "new",
  });
}

test("puppeteer renders the home page with hero, nav, and no page errors", async (t) => {
  const server = await startSite();
  t.after(() => server.stop());
  const browser = await launch();
  t.after(() => browser.close());

  const page = await browser.newPage();
  await page.setViewport({ height: 900, width: 1440 });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await page.goto(`${server.url}/`, { waitUntil: "networkidle0" });
  assert.match(await page.title(), /^Benefactor - Search, Paid, and Automation/);

  const hero = await page.$eval("h1", (el) => (el.textContent ?? "").replace(/\s+/g, " ").trim());
  assert.equal(hero, "Leaner funnels. Sharper intent. Compounding growth.");

  // The nav CTA to Calendly is the money link — it must survive and open safely.
  const cta = await page.$eval(
    'a[href="https://calendly.com/hello-benefactor/30min"]',
    (el) => ({ target: el.getAttribute("target"), rel: el.getAttribute("rel") }),
  );
  assert.equal(cta.target, "_blank");
  assert.match(cta.rel ?? "", /noopener|noreferrer/);

  assert.deepEqual(pageErrors, []);
});

test("puppeteer confirms in-page section anchors resolve to real targets", async (t) => {
  const server = await startSite();
  t.after(() => server.stop());
  const browser = await launch();
  t.after(() => browser.close());

  const page = await browser.newPage();
  await page.goto(`${server.url}/`, { waitUntil: "networkidle0" });

  // Every nav anchor must land on an element that actually exists in the DOM,
  // otherwise the smooth-scroll nav is silently broken.
  const anchors = await page.$$eval('a[href^="#"]', (nodes) =>
    [...new Set(nodes.map((n) => n.getAttribute("href")).filter((h) => h && h.length > 1))],
  );
  assert.ok(anchors.includes("#services"), "nav is missing the #services anchor");
  for (const href of anchors) {
    const id = href.slice(1);
    // Section ids on this site are plain identifiers; assert existence by id.
    const exists = await page.evaluate((x) => document.getElementById(x) !== null, id);
    assert.ok(exists, `anchor ${href} has no matching id in the DOM`);
  }
});

test("puppeteer builds the unsubscribe mailto from campaign + leadId query params", async (t) => {
  const server = await startSite();
  t.after(() => server.stop());
  const browser = await launch();
  t.after(() => browser.close());

  const page = await browser.newPage();
  // The unsubscribe page reads ?campaign & ?leadId and rewrites the mailto href.
  await page.goto(`${server.url}/unsubscribe/?campaign=fall-2026&leadId=lead-42`, {
    waitUntil: "networkidle0",
  });

  const href = await page.$eval("#unsubscribe-link", (el) => el.getAttribute("href"));
  assert.ok(href.startsWith("mailto:hello@benefactor.cc?subject=Unsubscribe&body="));
  const body = decodeURIComponent(href.split("body=")[1]);
  assert.match(body, /Campaign: fall-2026/);
  assert.match(body, /Lead: lead-42/);
});

test("puppeteer loads each standalone page 200 with its own title", async (t) => {
  const server = await startSite();
  t.after(() => server.stop());
  const browser = await launch();
  t.after(() => browser.close());

  const page = await browser.newPage();
  const expected = [
    ["/team/", /^Team \| Benefactor Marketing$/],
    ["/contact/", /^Contact \| Benefactor Marketing$/],
    ["/case-studies/", /Case Studies \| Benefactor Marketing$/],
    ["/blogs/", /^Blogs \| Benefactor Marketing$/],
  ];
  for (const [path, titleRe] of expected) {
    const res = await page.goto(`${server.url}${path}`, { waitUntil: "domcontentloaded" });
    assert.equal(res.status(), 200, `${path} did not return 200`);
    assert.match(await page.title(), titleRe, `${path} has an unexpected title`);
  }
});
