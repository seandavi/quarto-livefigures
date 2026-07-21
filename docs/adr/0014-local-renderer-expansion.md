# ADR 0014: Local renderer expansion — Graphviz and DBML; SMILES/ABC next

Date: 2026-07-20
Status: Accepted

## Context

A survey of JS/WASM renderer candidates (empirical headless renders, not
README claims) classified formats by our constraints: pure Node 18+,
esbuild-bundleable (no native binaries), SVG out, agent fluency first.

## Decision

Robust tier, shipped in 0.7.0:

- **Graphviz** (`.dot`, `.gv`; block `.dot`) via `@hpcc-js/wasm-graphviz`
  (Apache-2.0, ~0.8 MB, wasm embedded — self-contained). Highest agent
  fluency of any graph format; fills the file-referenced gap Quarto's
  code-cell dot support leaves open. Our class form `{.dot}` does not
  collide with Quarto's engine form `{dot}`.
- **DBML** (`.dbml`) via `@softwaretechnik/dbml-renderer` (ISC, ~2 MB,
  bundles viz.js). High-fluency schema DSL with a real database-docs
  audience. Requires a CJS `__dirname` banner shim in the esbuild config.
  Supersedes the kroki dbml route (local beats network).

Easy-win tier, planned as 0.8.0 (need a DOM shim; try the already-bundled
happy-dom before adding jsdom): **SMILES** (`smiles-drawer`, chemistry)
and **ABC notation** (`abcjs`, music).

Deferred with reasons: railroad-diagrams (source is a JS builder API —
means evaluating document-supplied JS, and fluency is capped);
pikchr-wasm (npm license field unconfirmed; kroki covers pikchr);
svgbob-wasm (bundler-target wasm esbuild can't instantiate; kroki covers
it); Penrose (heavy, three-DSL format with very low fluency); D2 (Go-only,
no maintained wasm — kroki is the only path).

## Consequences

- 18 formats: 12 local, 6 via kroki.
- Committed-bundle footprint grows ~2.8 MB; each backend stays an
  independent bundle.
- theme/background variants unsupported for both (hard-fail per ADR 0006).
