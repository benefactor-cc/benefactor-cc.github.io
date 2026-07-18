# benefactor.cc site — hardening & remaining work

Findings from the 2026-07 org audit.

## Done (2026-07)
- Added `robots.txt` (references sitemap; disallows `/internal/`), a 27-URL
  `sitemap.xml` (incl. the orphaned `/c/**` pages), self-referencing
  `rel=canonical` + OG/Twitter tags on all 27 public pages, and a branded
  `404.html`.
- Added a Puppeteer + Playwright + contract test suite and CI (earlier pass).

## Remaining — security
- **`/internal/` pages are publicly served static HTML** (`/internal/`,
  `/internal/payments/` margins, `/internal/retainer/` logic), guarded only by
  `noindex`. `robots.txt` `Disallow` asks compliant crawlers not to index — it is
  **not access control**; anyone with the URL can fetch the files. Fix options:
  1. Move these out of the public build (private repo / internal wiki), or
  2. Put the path behind auth (e.g. Cloudflare Access in front of Pages).
  They were intentionally left in place — removing them is a content decision.

## Remaining — release safety
- **Pages publishes `main` regardless of CI.** This is an org/user `*.github.io`
  repo, so GitHub serves `main` directly; a red-CI commit still goes live. Fix:
  require the CI check via branch protection before merge to `main`, OR convert
  to the Actions Pages pipeline (`upload-pages-artifact` + `deploy-pages`) gated
  on the test jobs.

## Remaining — polish
- **`og:image` is `apple-touch-icon.png`** (small, square). For rich link
  previews add a purpose-built 1200×630 social card and point `og:image` /
  `twitter:image` at it.
- **Orphaned `/c/**` landing pages**: now in the sitemap, but still have no
  in-site inbound links. Link them from a hub/index page so users (not just
  crawlers) can reach the programmatic-SEO pages.
- **Second site `benfactor-cc`** (typo repo) still serves stale content at
  `benefactor.cc/benfactor-cc/`. The apex CNAME collision is neutralized;
  archive that repo / disable its Pages (tracked in backend.rs
  `docs/HARDENING.md` org section).
