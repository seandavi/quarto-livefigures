# ADR 0004: LaTeX/PDF output uses high-res PNG from the bundled rasterizer

Date: 2026-07-20
Status: Accepted

## Context

LaTeX does not consume SVG. Pandoc auto-converts SVG images via
`rsvg-convert` (librsvg), but librsvg historically ignores embedded
`@font-face` webfonts — the exact mechanism we use to embed the Excalidraw
fonts (Virgil/Excalifont). Relying on it risks every PDF rendering diagrams
in a fallback font, violating our own font-correctness acceptance criterion.

Options considered:

- **A. SVG + `rsvg-convert`** — vector output, but the font risk above and an
  external dependency users must install.
- **B. High-res PNG (2–3x scale) from our own bundle** — `@resvg/resvg-js`
  (WASM SVG rasterizer) bundles into the Node renderer (ADR 0001) and allows
  registering font files explicitly. Fonts guaranteed correct; no external
  converter dependency; same code path later serves DOCX.

## Decision

Option B: for LaTeX-based formats the renderer emits a high-resolution PNG
(2–3x scale) rasterized in-bundle via resvg with the Excalidraw fonts
registered. `rsvg-convert` is not a dependency of the extension.

**Spike results (2026-07-20):** librsvg 2.x confirmed ignoring embedded
`@font-face` data-URL fonts (renders fallback sans), validating this
decision; it does render the font correctly when installed via fontconfig,
so a vector opt-in remains possible later. Two implementation findings:
the napi binding (`@resvg/resvg-js` 2.6.2) `fontBuffers` option loads the
font but renders wrong glyphs — `fontFiles` and the wasm build's
`fontBuffers` are correct; and the wasm build is required anyway because
napi `.node` binaries cannot be bundled into the single-file renderer.
Production uses `@resvg/resvg-wasm` with TTFs converted from Excalidraw's
woff2 assets at build time.

## Consequences

- PDF figures are raster, not vector. Hand-drawn Excalidraw content at 2–3x
  is visually indistinguishable in print; revisit if users report zoom/print
  fidelity problems.
- One fewer external dependency (only Node remains).
- The rasterization path doubles as the future DOCX/PNG path.
