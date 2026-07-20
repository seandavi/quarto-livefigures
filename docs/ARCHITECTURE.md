# Architecture

quarto-livefigures makes editable figure sources (`.excalidraw` first)
first-class Quarto figures: the source file is referenced with native image
syntax, and rendering happens inside `quarto render`. See PROPOSAL.md for
goals; each decision below is recorded as an ADR in `docs/adr/`.

## Pipeline

```
paper.qmd: ![Caption](figures/arch.excalidraw){#fig-arch width=80%}
                    │
                    ▼
  Lua filter (runs early, before Quarto's figure/crossref processing)
    - detects Image targets ending in .excalidraw            [ADR 0002]
    - computes key = sha256(scene bytes + options + ext version)
    - cache hit?  _livefigures/arch-<hash8>.svg exists → reuse [ADR 0003]
    - miss → shell out: node renderer.mjs <scene> <options>   [ADR 0001]
    - rewrites Image target to the cached asset
                    │
                    ▼
  Quarto's native figure pipeline
    - captions, labels, crossrefs, sizing, layout, subfigures, lightbox
      all behave as for any ordinary image
```

## Per-format output

| Format group             | Asset                                     | ADR  |
| ------------------------ | ----------------------------------------- | ---- |
| HTML family (+ RevealJS) | SVG, fonts embedded; dark mode via CSS filter | 0005 |
| PDF / LaTeX              | high-res PNG rasterized in-bundle (resvg) | 0004 |
| DOCX / EPUB              | deferred, "may work, untested"            | 0007 |

## Components

- **`livefigures.lua`** — Quarto integration only: detection, cache lookup,
  shell-out, target rewrite, error reporting (hard fail, ADR 0006). Knows
  nothing about Excalidraw internals.
- **`renderer.mjs`** — the backend seam: "file + options in → SVG/PNG out."
  A committed esbuild bundle of the Excalidraw export library plus resvg for
  rasterization; requires only Node >= 18 on PATH. Future backends (kroki,
  tldraw) implement the same contract. [ADR 0001, 0009]
- **`_livefigures/` cache** — content-addressed build artifacts, gitignored;
  no manifest, no GC (delete the directory to reclaim space). [ADR 0003]

## Options

`theme` (`light`|`dark`|`auto`) and `background` (`transparent`|`scene`),
per-image via attributes or project-wide via `livefigures:` metadata; both
participate in the cache key. [ADR 0005]

## Testing

End-to-end: `node:test` fixtures run real `quarto render` and assert on
output; ubuntu CI with TinyTeX; a bundle-diff job guards the committed
renderer. Windows is a documented limitation pending fast-follow. [ADR 0008]

## ADR index

| ADR  | Decision |
| ---- | -------- |
| 0001 | Renderer runtime: bundled single-file Node script |
| 0002 | Integration: Lua filter rewriting Image targets |
| 0003 | Content-addressed cache in gitignored `_livefigures/` |
| 0004 | PDF via in-bundle high-res PNG (librsvg font risk) |
| 0005 | Options `theme`/`background`; CSS-filter dark mode |
| 0006 | Hard-fail error behavior |
| 0007 | MVP scope: HTML family + PDF; DOCX/EPUB deferred |
| 0008 | Tests: node:test + real renders; ubuntu CI |
| 0009 | Repo layout, committed bundle, tag releases |
