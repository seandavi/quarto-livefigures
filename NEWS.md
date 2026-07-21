# quarto-livefigures release notes

## 0.6.0 (2026-07-20)

- **Eight more kroki-backed formats**, batch-enabled after an empirical
  survey of kroki.io: **D2** (`.d2`), **C4-PlantUML** (`.c4`),
  **Structurizr** (`.structurizr`), **erd** (`.erd`), **ditaa**
  (`.ditaa`), **pikchr** (`.pikchr`), **svgbob** (`.svgbob`), and
  **TikZ** (`.tikz` — source must be a complete `standalone` document).
  All have matching code-block classes.
- Not enabled, with reasons recorded in ADR 0012: the blockdiag family is
  broken server-side on kroki.io (silent empty responses); umlet and BPMN
  require hand-placed coordinates (not agent-authorable); symbolator and
  wireviz are deep-niche with weak LLM fluency.
- **Robustness**: the kroki client now rejects empty/non-SVG HTTP 200
  responses (a real kroki.io failure mode) and sends an explicit
  User-Agent (some default client UAs are blocked by kroki.io's CDN).

## 0.5.0 (2026-07-20)

- **Inline code-block figures** (ADR 0013): fence a diagram with a backend
  class and it becomes a first-class figure — captions, labels, and
  cross-references included:

      ```{.nomnoml #fig-pipe fig-cap="The pipeline"}
      [Filter] -> [Cache]
      ```

  Classes: `.excalidraw`, `.vega-lite`, `.vega`, `.nomnoml`, `.wavedrom`,
  `.bytefield`, `.plantuml`. Same cache, options, and hard-fail behavior
  as file-referenced figures; identical inline sources share cache entries.
- **Recommended install form changed** — cross-references on inline blocks
  require the filter to run in the pre-ast phase:

      filters:
        - at: pre-ast
          path: livefigures

  The plain `filters: [livefigures]` form still works for file-referenced
  figures.

## 0.4.0 (2026-07-20)

- **New backend class: kroki-rendered formats**, starting with **PlantUML**
  (`.puml`, `.plantuml`) — ADR 0012. Sources render via a kroki HTTP
  endpoint (default `https://kroki.io`, self-host via
  `livefigures: kroki-url:` metadata).
- PDF output stays deterministic: livefigures fetches SVG and rasterizes
  locally with its bundled fonts; kroki's PNG output is not used.
- Know the tradeoffs (documented in README + ADR 0012): network needed on
  cache misses, diagram source is sent to the endpoint (self-host for
  private diagrams), and kroki server upgrades can change output.
- Unreachable endpoint fails loudly with the self-hosting escape hatch in
  the message; warm-cache rebuilds work offline.
- Gallery gains a PlantUML page.

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
