# Contributing to quarto-livefigures

Thanks for your interest! Issues and pull requests are welcome.

## Development setup

Requirements: [Quarto](https://quarto.org/) ≥ 1.4, Node ≥ 18. For PDF
tests, TinyTeX (`quarto install tinytex`).

```bash
cd renderer && npm install && npm run build   # rebuild the committed bundles
node --test tests/test.mjs                    # end-to-end tests (real quarto renders)
quarto preview examples/gallery               # play with the extension locally
```

The bundles under `_extensions/livefigures/` are **committed build
artifacts** (see ADR 0009 — `quarto add` cannot run a build). If you touch
anything under `renderer/`, run `npm run build` and commit the result; CI
rebuilds and fails on any diff.

## How the project makes decisions

Every architectural decision is an ADR under [`docs/adr/`](docs/adr/) —
read the relevant ones before proposing structural changes, and include a
new ADR in your PR if you're making one. Two norms worth knowing:

- **Errors are loud.** Rendering problems abort the build (ADR 0006);
  never add a silent fallback.
- **Backends must be agent-authorable** (ADR 0010/0011): plain-text or
  JSON sources that LLMs write reliably. Formats needing hand-placed
  coordinates are out of scope.

## Adding a format backend

1. Renderer: pure Node ≥ 18, esbuild-bundleable (no native binaries),
   SVG out; add an entry in `renderer/build.mjs`. Reuse
   `renderer/src/rasterize.mjs` for PNG. Formats without a JS renderer
   can go through the kroki backend (one registry line).
2. Register it in the `BACKENDS` table in
   `_extensions/livefigures/livefigures.lua` (pattern, block class,
   capability flags).
3. Add a fixture + e2e test in `tests/`, a gallery example in
   `examples/gallery/` and `site/gallery/`, and rows in the README and
   `site/formats.qmd`.
4. Note it in `NEWS.md`.

## Pull requests

- CI must be green: tests, example renders, bundle-integrity check, and a
  site preview deploy.
- Version bumps happen when extension behavior changes and touch three
  files kept in sync (CI enforces it): `_extension.yml`, `VERSION` in the
  Lua filter, and `version:` in `CITATION.cff` (update `date-released:`
  too). Cache keys include the version, so bumps intentionally
  invalidate caches.
- Site-only and docs-only changes don't need a version bump.

## Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).
