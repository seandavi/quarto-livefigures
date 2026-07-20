# ADR 0002: Integrate via a Lua filter that rewrites Image targets

Date: 2026-07-20
Status: Accepted

## Context

The extension needs a hook into `quarto render` that preserves native figure
syntax (`![](fig.excalidraw){#fig-x}`) and Quarto's figure semantics
(captions, labels, cross-references, sizing, layout, subfigures, lightbox).

Candidates considered:

- **Lua filter on `Image` elements** — intercept images whose target ends in
  `.excalidraw`, render, rewrite the target to the generated asset. Quarto's
  own figure machinery then treats it as an ordinary image. Pattern proven by
  the `quarto-d2` extension.
- **Shortcode** — bespoke syntax; shortcodes do not participate in figure
  semantics (labels, subfigure layout). Rejected.
- **Cell handler / execution engine** — designed for diagram source embedded
  in code cells (as with Mermaid), not file references. Rejected.
- **Project pre-render script** — cannot rewrite the AST, so documents would
  reference generated files, breaking single source of truth; misses files
  outside configured directories. Rejected.

## Decision

A Pandoc Lua filter, registered in `_extension.yml`, that runs early (before
Quarto's crossref/figure processing), detects `Image` elements targeting
`.excalidraw` files, invokes the renderer (ADR 0001), and rewrites the image
target. All figure semantics are delegated to Quarto's native pipeline.

## Consequences

- Goals 1–2 (native syntax, native semantics) hold by construction; most
  figure-feature tests are effectively testing Quarto, not the extension.
- Filter ordering relative to Quarto's internal filters is a known sharp
  edge: the spike must verify captions and crossrefs survive in both HTML and
  PDF output.
- Per-image rendering options can be read directly from image attributes.
