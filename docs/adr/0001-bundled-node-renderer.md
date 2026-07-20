# ADR 0001: Renderer runtime is a bundled single-file Node script

Date: 2026-07-20
Status: Accepted

## Context

The extension must convert `.excalidraw` scenes to SVG during `quarto render`.
Excalidraw's export APIs are browser/React-oriented, so some JS runtime is
required. `quarto add` copies files into `_extensions/` and cannot run an npm
install, so the renderer must ship as static files.

Candidates considered:

- **Bundled single-file Node script** — export library esbuild-bundled into one
  committed `.mjs`; requires only `node` on PATH.
- **Headless browser (puppeteer)** — highest fidelity, but a ~300 MB dependency
  that cannot be installed via `quarto add`. Rejected.
- **Kroki HTTP service** — no local runtime, but network-dependent, unpinnable
  on the public instance, and sends unpublished figures to a third party.
  Deferred to an optional `renderer: kroki` backend later. Rejected for default.
- **Deno** — Quarto ships one internally but extensions cannot invoke it;
  requiring a separate user Deno install is strictly worse than Node. Rejected.

## Decision

The default renderer is a single esbuild-bundled `.mjs` file committed to the
extension, executed by shelling out to `node` (>= 18) on the user's PATH. No
runtime npm installs. The choice of export library inside the bundle
(`@excalidraw/utils`, `excalidraw-to-svg`, or a jsdom shim) is determined by a
feasibility spike and recorded when settled; this ADR fixes only the runtime
contract.

## Consequences

- Node >= 18 becomes a documented user-facing dependency; a missing runtime
  must fail with a clear, actionable error (see Definition of Done).
- Builds are offline and deterministic; the bundle content participates in the
  cache key.
- The renderer seam is "file + options in, SVG out", leaving room for
  alternative backends (e.g. kroki) behind the same interface.
