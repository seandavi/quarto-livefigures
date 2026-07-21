# ADR 0012: Kroki backend class for formats without a JS renderer — PlantUML first

Date: 2026-07-20
Status: Accepted

## Context

PlantUML has the largest unserved audience of any remaining format (no
native Quarto support, LLMs are fluent in it) but no JS renderer — the
reference implementation is a Java jar. ADR 0001 deferred kroki as an
optional backend; Sean approved the kroki approach over java-on-PATH.

## Decision

A `renderer-kroki.mjs` backend (tiny bundle, no new deps) POSTs the source
to a kroki endpoint, fetches **SVG**, and rasterizes PNG locally through
the shared deterministic font pipeline — kroki's own PNG output is not
used, keeping PDF font behavior identical to every other backend.

- Endpoint defaults to `https://kroki.io`, configurable via
  `livefigures: kroki-url:` metadata (self-hosting supported and
  documented). The endpoint participates in the cache key.
- First registered format: PlantUML (`.puml`, `.plantuml`).
  `theme`/`background` variants are unsupported (hard-fail, ADR 0006).
- Unreachable endpoint or a kroki error hard-fails naming the file, the
  endpoint, and the self-hosting escape hatch.

## Accepted tradeoffs (why this is a distinct backend *class*)

- **Network dependency at render time** (cache misses only; warm-cache
  rebuilds work offline). Documented per-format in the README.
- **Figure source is sent to the endpoint** — private diagrams should use
  a self-hosted kroki.
- **Weaker determinism**: the kroki server version is not in the cache
  key; a server upgrade can change output for new renders.
- kroki's Excalidraw support remains broken (ADR 0001) — kroki formats are
  additive, never a substitute for local backends.
- Gallery/CI render a PlantUML figure, accepting rare kroki.io-outage CI
  failures as visible and re-runnable; e2e tests skip cleanly when the
  endpoint is unreachable.

## Consequences

- The kroki door is open: C4/Structurizr/ditaa/etc. are now one registry
  line each, gated only on demand.
- Version 0.4.0.

## Addendum (2026-07-20, v0.6.0): batch enable per empirical survey

All 28 kroki.io diagram types were probed with minimal valid sources.
Enabled: d2, c4plantuml, structurizr, erd, ditaa, pikchr, svgbob, tikz
(tikz requires a complete `standalone` LaTeX document — kroki's own error
message is actionable). Excluded: the blockdiag family (blockdiag,
seqdiag, actdiag, nwdiag, packetdiag, rackdiag) is broken server-side —
HTTP 200 with an empty body; umlet and bpmn require hand-placed x/y
coordinates (not agent-authorable, against the project thesis); symbolator
and wireviz are deep-niche with weak LLM fluency. dbml works on kroki but
is reserved for a local renderer (survey found a self-contained JS one).

Two client fixes from the survey: reject 200-with-no-SVG responses
(otherwise a broken backend caches an empty figure), and send an explicit
User-Agent (kroki.io's CDN blocks some default client UAs).
