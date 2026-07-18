# benefactor.cc site tests

This repo is the **built** GitHub Pages output for benefactor.cc (the HTML is
committed; there is no build step here). The tests therefore serve the repo root
as a static site and drive the committed pages directly, so they check exactly
the bytes Pages publishes.

Three layers, all on `node:test`:

| File | Engine | Runs in CI | What it covers |
|------|--------|-----------|----------------|
| `site-contract.test.mjs` | none (parses HTML) | `contract` job, always | titles, meta, hero copy, nav links, section anchors, CNAME, outbound-link hardening |
| `site-puppeteer.test.mjs` | Puppeteer | `browser-e2e` job | home render, anchor targets, unsubscribe mailto builder (with query params), per-page 200 + titles |
| `site-playwright.test.mjs` | Playwright | `browser-e2e` job | home hero + nav (role locators), case-studies page, team roster opener-safety, unsubscribe defaults |

`site-harness.mjs` is shared: it boots an ephemeral static server for the repo
and resolves one Chrome binary for **both** engines (`CHROME_BIN` in CI, else a
bundled/system Chrome locally).

## Run locally

```bash
npm install
npm test              # fast contract checks, no browser
npm run test:browser  # Puppeteer + Playwright (uses local Chrome)
npm run test:all      # everything
```

Point the browser suites at a running site instead of the served copy:

```bash
BENEFACTOR_SITE_URL=https://benefactor.cc npm run test:browser
```

The same `BENEFACTOR_SITE_URL` smoke is wired into the cluster's browser runners
at `~/codes/ores/k8s-cluster/remote/tests` (`npm run test:ui:benefactor`).
