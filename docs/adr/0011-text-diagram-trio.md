# ADR 0011: Text-diagram trio — nomnoml, WaveDrom, bytefield

Date: 2026-07-20
Status: Accepted

## Context

Backend selection is driven by agent fluency (formats LLMs author
reliably), the no-native-Quarto-support gap, and pure-Node bundleability
(ADR 0010 precedent). Mermaid/Graphviz are native to Quarto; D2 has a
community extension; node-edge graphs are already covered twice (raw Vega
force layouts, and nomnoml itself via dagre).

## Decision

Ship three pure-JS backends in one shared bundle (`renderer-text.mjs`,
~1 MB total):

- **nomnoml** (`.noml`, `.nomnoml`) — terse node-edge/UML DSL, dagre
  auto-layout; the highest-agent-fluency graph format available.
- **WaveDrom** (`.wavedrom`, `.wavedrom.json`) — JSON timing/register
  diagrams; JSON sources are maximally agent-native.
- **bytefield** (`.bytefield`) — byte/packet layout DSL; most obscure of
  the three but simple syntax with abundant protocol-doc examples.

Capability flags join the backend registry: these formats have no dark
theme or scene background, so `theme=dark` / `background=scene` hard-fail
with a clear message (ADR 0006) instead of silently rendering wrong.
PNG for LaTeX reuses the shared rasterizer (Helvetica/sans-serif map to
bundled Liberation Sans; deterministic PDFs).

Deferred: PlantUML (needs its own decision — Java on PATH vs a kroki
backend, which would unlock C4/Structurizr/ditaa at the cost of a network
dependency); Penrose, DBML, ABC notation, svgbob/pikchr await demand.

## Consequences

- Six source formats behind one seam; marginal backend cost is now
  demonstrably ~a day.
- The registry gains per-backend capability flags, the pattern any future
  backend follows.
- Version 0.3.0; cache keys invalidate as designed.
