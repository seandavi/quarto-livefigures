# quarto-livefigures release notes

## 0.3.0 (2026-07-20)

- **Three new backends** (ADR 0011), selected for agent fluency — formats
  LLMs author reliably, none with existing Quarto support:
  - **nomnoml** (`.noml`, `.nomnoml`): terse node-edge/UML diagrams with
    automatic dagre layout.
  - **WaveDrom** (`.wavedrom`, `.wavedrom.json`): digital timing and
    register diagrams from JSON.
  - **bytefield** (`.bytefield`): byte/packet layout diagrams.
- All three are pure JS in one shared ~1 MB bundle; PDFs use the shared
  deterministic rasterizer.
- These formats have no dark/scene variants: `theme=dark` or
  `background=scene` on them fails loudly rather than rendering wrong.
- Deferred with rationale (see ADR 0011): PlantUML (Java-vs-kroki decision
  pending), Penrose, DBML, ABC notation.

## 0.2.0 (2026-07-20)

- **New backend: Vega-Lite / Vega** (`.vl.json`, `.vg.json`). Charts render
  headless through a dedicated bundled renderer (ADR 0010) — chosen over
  draw.io for agentic-editing workflows, where JSON specs that LLMs author
  reliably beat hand-unfriendly XML.
- PDF/LaTeX chart output uses the shared rasterizer with bundled Liberation
  Sans, so PDFs are deterministic across machines (no system fonts).
- `theme=auto` no longer applies the CSS dark-mode filter to charts —
  inverting data-encoded colors would misrepresent them. Excalidraw figures
  keep the filter. Explicit `theme=dark` gives charts the vega dark theme.
- Cache keys now include the backend name; upgrading invalidates caches
  (as designed — the renderer changed).

## 0.1.0 (2026-07-20)

- Initial release: native `.excalidraw` figures via standard Quarto image
  syntax — captions, labels, cross-references, sizing, layout, and lightbox
  all flow through Quarto's own figure pipeline.
- Offline, deterministic rendering with a bundled headless Node renderer;
  Node >= 18 is the only external dependency.
- HTML family + RevealJS (SVG with embedded fonts) and PDF (high-res PNG)
  verified end-to-end; content-addressed incremental cache in
  `_livefigures/`.
- Options: `theme` (light/dark/auto) and `background` (transparent/scene).
- Known limitations: Windows untested, CJK (Xiaolai) font not bundled,
  DOCX/EPUB unverified.
