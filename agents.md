# Benefactor website agent instructions

## Website, claims, and privacy invariants

- Keep service descriptions, case studies, target customers, contact/outreach claims, pricing/capability statements, application links, legal/privacy content, and public URLs aligned with the current Benefactor product and reviewed business policy.
- Never publish invented client results, guarantees, testimonials, partner logos, application approvals, or unsupported claims. Clearly distinguish examples, targets, estimates, and verified outcomes.
- Contact and lead forms must preserve consent disclosure, minimum necessary fields, spam/abuse controls, bounded payloads, secure transport, and server-side validation. Never expose provider keys or route form submissions through client-visible secrets.
- Do not include private customer strategy, lead lists, personal contact data, email content, credentials, analytics identifiers containing sensitive data, or internal application material in source, generated output, screenshots, fixtures, logs, or public artifacts.
- Preserve accessible semantic HTML, keyboard/focus behavior, responsive layout, contrast, meaningful link text, safe external links, and browser-error-free output.
- GitHub Pages/deployment must publish the exact reviewed and tested source with pinned Actions, minimal permissions, no persisted credentials, bounded concurrency, and explicit provenance.
- Generated site output and lockfiles are derived from canonical source. Do not merge generated HTML/bundles line-by-line or treat an ancestry-only merge as content reconciliation unless equivalence is independently compared, documented, and verified.

## Instruction discovery

Resolve `$PWD`, walk upward through every parent directory to the filesystem root, read every readable lowercase `agents.md` on that ancestor chain, and apply them root-to-leaf. Do not search sibling directories. Deduplicate resolved paths/inodes, avoid symlink cycles, and report unreadable files.

## Synchronize with the remote

Before editing, inspect `git status`, the current branch, configured remotes, and the default branch. Run `git fetch --all --prune` and create the feature branch from the latest remote default branch, not a stale local copy. Fetch again before pushing and incorporate upstream changes according to repository policy. Never discard remote commits, force-push, rewrite shared history, bypass review, or bypass required CI.

## Resolve Git conflicts semantically

Resolve conflicts by understanding and combining both sides' intent. Do not mechanically choose `ours`, `theirs`, current, or incoming changes. Produce the conceptually correct public site while preserving accurate claims, consent/form behavior, privacy boundaries, accessibility, links, deployment provenance, tests, documentation, configuration, and public URLs. Merge canonical source first and regenerate build output/lockfiles; do not retain duplicated sections or stale generated pages from both sides. If intentions are incompatible, make the smallest explicit design decision and document it in the pull request.

After resolving:

1. Reread every affected source page, form, data file, workflow, and generated entrypoint from the top.
2. Run site checks/builds, link/accessibility tests, form validation/security tests, browser E2E, content/claim review, dependency audit, and workflow validation.
3. Search the entire worktree for unresolved conflict markers:

   ```sh
   grep -RInE '^(<<<<<<<|=======|>>>>>>>)' --exclude-dir=.git .
   ```

4. If any marker, duplicated/stale content, unsupported claim, privacy leak, broken form, or suspicious partial resolution remains, repeat semantic resolution from the top and rerun validation.

A conflict is resolved only when the generated public site is conceptually coherent, accurate, accessible, and verified—not merely when the build succeeds.
