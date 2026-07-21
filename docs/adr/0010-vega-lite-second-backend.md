# ADR 0010: Vega-Lite is the second backend; draw.io deprioritized

Date: 2026-07-20
Status: Accepted

## Context

The extension name promises more than Excalidraw (see PROPOSAL.md). The
short-list from ADR 0001: draw.io (highest general demand, but Electron-CLI
renderer and hand-unfriendly mxGraph XML) and Vega-Lite (pure-Node render,
JSON specs). tldraw remains ruled out on licensing.

The project's priority is **agentic editing**: figure sources that AI
agents read, write, and diff well. Vega-Lite JSON is a format LLMs author
reliably; draw.io XML is not.

## Decision

Vega-Lite (`.vl.json`) and raw Vega (`.vg.json`, nearly free since Vega is
the runtime) are the second backend. draw.io is deprioritized — revisit
only on concrete user demand.

Implementation: a separate committed bundle (`renderer-vega.mjs`, ~0.8 MB;
vega + vega-lite, `canvas` externalized — headless text metrics suffice).
PNG for LaTeX reuses the shared resvg-wasm rasterization with bundled
Liberation Sans mapped as the sans-serif/default family, keeping PDF
output deterministic with no system-font dependence. A backend registry in
the Lua filter routes by file extension; backend name joins the cache key.

`theme=dark` applies the vega-themes dark config. `theme=auto` resolves to
light **without** the CSS invert filter: inverting is faithful for
hand-drawn strokes but corrupts data-encoded chart colors, so the
`dark_css` flag in the registry is per-backend.

## Consequences

- The extension name is now earned: two backends behind one seam.
- Renderer bundles stay independent — Excalidraw churn cannot break charts.
- Vega figures on dark HTML themes stay light (documented); a true dark
  variant needs explicit `theme=dark`.
- No new external dependencies; Node >= 18 remains the only requirement.
