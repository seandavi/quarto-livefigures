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
  Rejected for default. **Spike result (2026-07-20):** kroki.io's Excalidraw
  renderer returns HTTP 500 for every non-empty scene tested (modern schema,
  legacy pre-2022 schema, bare rectangle, bare text); only an empty scene
  renders. Control test (graphviz) succeeded, so the service itself was
  healthy. Kroki is therefore NOT a viable Excalidraw fallback at all; it
  remains interesting only as a phase-2 backend for other engines
  (Mermaid/Graphviz/PlantUML), which do work.
- **Deno** — Quarto ships one internally but extensions cannot invoke it;
  requiring a separate user Deno install is strictly worse than Node. Rejected.

## Decision

The default renderer is a single esbuild-bundled `.mjs` file committed to the
extension, executed by shelling out to `node` (>= 18) on the user's PATH. No
runtime npm installs. The choice of export library inside the bundle
(`@excalidraw/utils`, `excalidraw-to-svg`, or a jsdom shim) is determined by a
feasibility spike and recorded when settled; this ADR fixes only the runtime
contract.

## Future backend candidates (assessed 2026-07-20)

- **tldraw** — ruled out on licensing: the SDK is source-available with
  license-key enforcement; production use requires a commercial license and
  standalone redistribution is prohibited. Not viable for an open-source
  extension regardless of architecture. Do not re-litigate absent a license
  change.
- **draw.io** — viable second backend, likely highest demand. No pure-Node
  renderer exists; the sanctioned path is the draw.io desktop CLI (Electron;
  xvfb/Docker on headless CI). Acceptable: the renderer seam lets each
  backend declare its own runtime dependency with the same hard-fail checks.
- **Vega-Lite** — architecturally cheapest: vega renders headless in pure
  Node and would join the existing bundle nearly for free. Lower demand as a
  hand-drawn-figure format.

Second-backend choice is deferred to user demand (tracked in a GitHub issue).

## Consequences

- Node >= 18 becomes a documented user-facing dependency; a missing runtime
  must fail with a clear, actionable error (see Definition of Done).
- Builds are offline and deterministic; the bundle content participates in the
  cache key.
- The renderer seam is "file + options in, SVG out", leaving room for
  alternative backends (e.g. kroki) behind the same interface.
