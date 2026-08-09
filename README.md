# benefactor-cc.github.io

Published GitHub Pages build output for [benefactor.cc](https://benefactor.cc).

## Source-of-truth boundary

This repository contains the generated static site that is served publicly. The canonical Astro source lives in [`ORESoftware/benefactor.cc`](https://github.com/ORESoftware/benefactor.cc).

Make content, layout, component, form, analytics, and dependency changes in the canonical source repository. After review and validation there, publish the generated output here as one coherent artifact. Do not hand-edit minified HTML, CSS, or JavaScript independently because the next source build will overwrite those changes and can hide drift between reviewed source and production output.

## Validation

Run the dependency-free artifact checks with Node.js 22 or newer:

```sh
node scripts/validate-static-site.mjs
```

The validator recursively checks the committed public artifact for:

- HTML document structure and language/viewport metadata;
- a restrictive Content Security Policy;
- unsafe protocols and external links opened without `noopener`;
- missing local pages and assets referenced by HTML;
- conflict markers and common secret-token prefixes.

GitHub Actions runs the same checks for pull requests and pushes to `main` with read-only repository permissions.

## Deployment rules

- Publish only reviewed, generated output from the canonical source.
- Keep private lead data, customer strategy, credentials, provider tokens, and internal application material out of this public repository.
- Preserve accurate claims, consent/form behavior, accessibility, safe external links, and deterministic deployment provenance.
- Never bypass a failed artifact validation check by editing generated output around the failure; fix the source or generator and rebuild.
