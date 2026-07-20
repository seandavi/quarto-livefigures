# ADR 0009: Repo layout, committed renderer bundle, tag-based releases

Date: 2026-07-20
Status: Accepted

## Context

`quarto add seandavi/quarto-livefigures` copies the repo's `_extensions/`
directory verbatim; there is no install-time build step and no registry.

## Decision

Layout:

```
_extensions/livefigures/
    _extension.yml        # registers the Lua filter
    livefigures.lua       # the filter (ADR 0002)
    renderer.mjs          # committed esbuild bundle (ADR 0001)
    fonts/                # Excalidraw fonts for embedding/rasterizing
    livefigures.css       # dark-mode filter rule (ADR 0005)
renderer/                 # bundle source: package.json, src/, build script
tests/                    # node:test + fixture projects (ADR 0008)
examples/  article/  book/  revealjs/
docs/  adr/  ARCHITECTURE.md
```

- **Committed bundle:** `renderer.mjs` is the one sanctioned exception to
  "never commit generated files" (Goal 5), because `quarto add` cannot build.
  A CI job rebuilds the bundle and fails if it differs from the committed
  copy, eliminating staleness by machine rather than discipline.
- **Extension name:** `livefigures` — future backends (kroki, tldraw) live
  inside this extension, not as siblings.
- **Releases:** git tags (`v0.1.0`) + GitHub releases; users pin via
  `quarto add seandavi/quarto-livefigures@v0.1.0`. No registry or publish
  pipeline.

## Consequences

- Installation is exactly the standard Quarto mechanism (Goal 7).
- The bundle-diff CI job is the only release hygiene needed.
- Extension version participates in the cache key (ADR 0003), so upgrading
  the extension invalidates caches automatically.
