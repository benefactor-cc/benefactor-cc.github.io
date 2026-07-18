// Fast source-contract tests: assert (without a browser) that the committed
// GitHub Pages HTML keeps its key marketing content, navigation, canonical
// domain, and outbound-link hardening. These run in every CI job because they
// need no browser and catch the cheap regressions before the E2E gate.
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

const root = new URL("..", import.meta.url);
const read = (p) => readFile(new URL(p, root), "utf8");

const home = await read("index.html");
const pages = {
  team: await read("team/index.html"),
  contact: await read("contact/index.html"),
  "case-studies": await read("case-studies/index.html"),
  blogs: await read("blogs/index.html"),
  unsubscribe: await read("unsubscribe/index.html"),
};

test("home page keeps its production <head> metadata", () => {
  assert.match(home, /<title>Benefactor - Search, Paid, and Automation for Founder-Led B2B \| Benefactor Marketing<\/title>/);
  assert.match(home, /<meta name="description" content="Benefactor partners with founder-led B2B teams/);
  assert.match(home, /name="viewport"/);
  assert.match(home, /property="og:title"/i);
});

test("hero headline stays the three-beat positioning line", () => {
  const hero = home.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  assert.ok(hero, "no <h1> on the home page");
  const text = hero[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  assert.equal(text, "Leaner funnels. Sharper intent. Compounding growth.");
});

test("primary nav exposes every section and page link", () => {
  // In-page anchors to the landing sections...
  for (const anchor of ["#services", "#process", "#results", "#team", "#contact"]) {
    assert.ok(home.includes(`href="${anchor}"`), `missing nav anchor ${anchor}`);
  }
  // ...and the standalone pages.
  for (const href of ["/contact/", "/case-studies/", "/blogs/", "/team/"]) {
    assert.ok(home.includes(`href="${href}"`), `missing nav link ${href}`);
  }
});

test("every landing section anchor has a matching target id", () => {
  for (const id of ["services", "competencies", "process", "results", "team", "contact"]) {
    assert.match(home, new RegExp(`id="${id}"`), `missing section id="${id}"`);
  }
});

test("standalone pages keep the Benefactor Marketing title suffix", () => {
  const expected = {
    team: "Team | Benefactor Marketing",
    contact: "Contact | Benefactor Marketing",
    "case-studies": "Local SEO Case Studies | Benefactor Marketing",
    blogs: "Blogs | Benefactor Marketing",
    unsubscribe: "Unsubscribe | Benefactor Marketing",
  };
  for (const [name, title] of Object.entries(expected)) {
    assert.ok(pages[name].includes(`<title>${title}</title>`), `${name}: wrong <title>`);
  }
});

test("CNAME is the canonical domain and the site never ships javascript: links", async () => {
  const cname = (await read("CNAME")).trim();
  assert.equal(cname, "benefactor.cc", "GitHub Pages CNAME must stay the canonical domain");
  // No dangerous inline-script hrefs anywhere on the primary pages.
  for (const [name, html] of Object.entries({ home, ...pages })) {
    assert.doesNotMatch(html, /href="\s*javascript:/i, `${name} ships a javascript: href`);
  }
});

test("outbound links open safely (reverse-tabnabbing hardening)", () => {
  // The repo history hardened external links; keep every target=_blank paired
  // with a rel that severs window.opener. Either noopener or noreferrer does
  // this (noreferrer implies noopener), so accept both.
  const blankLinks = home.match(/<a\b[^>]*target="_blank"[^>]*>/gi) ?? [];
  assert.ok(blankLinks.length > 0, "expected outbound target=_blank links on the home page");
  for (const tag of blankLinks) {
    assert.match(
      tag,
      /rel="[^"]*(noopener|noreferrer)[^"]*"/i,
      `target=_blank without rel=noopener/noreferrer: ${tag}`,
    );
  }
});
