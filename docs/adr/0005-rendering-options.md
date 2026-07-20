# ADR 0005: Rendering options — `theme` and `background`, CSS-filter dark mode

Date: 2026-07-20
Status: Accepted

## Context

Figures must behave sensibly in dark-mode HTML themes and allow control over
scene background (Definition of Done). Options need per-image and
project-wide expression without inventing syntax.

## Decision

- **Surface:** per-image via native attributes
  (`![](fig.excalidraw){theme=dark background=scene}`); project/document
  defaults under a `livefigures:` YAML metadata key. Attribute names are
  unnamespaced; `width`/`height` remain Quarto's.
- **`background`:** `transparent` (default) | `scene` (scene's background
  color).
- **`theme`:** `light` | `dark` | `auto`; default `auto` for HTML formats,
  `light` elsewhere.
- **`auto` mechanism:** render light once; a single scoped CSS rule applies
  `filter: invert(...) hue-rotate(180deg)` to livefigure images when the page
  is in dark mode — the same mechanism Excalidraw itself uses for dark theme,
  so fidelity matches the editor. Explicit `theme=dark` performs a true dark
  export.

Rejected: double-rendering light + dark SVGs swapped via Quarto's theme
classes — doubles render work and cache entries and couples to theme-class
internals for no fidelity gain.

## Consequences

- One render and one cache entry per figure regardless of page theme.
- No user-facing scale/padding options in MVP; the 2–3x LaTeX PNG scale
  (ADR 0004) stays internal.
- Options participate in the cache key (ADR 0003).
