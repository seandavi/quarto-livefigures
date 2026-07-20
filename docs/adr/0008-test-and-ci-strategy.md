# ADR 0008: End-to-end tests via `node:test` + real `quarto render`; ubuntu CI

Date: 2026-07-20
Status: Accepted

## Context

The Definition of Done items (captions, crossrefs, sizing, cache
invalidation, incremental rebuild, HTML + PDF output) are end-to-end
properties of a real render, not unit-testable in isolation.

## Decision

- **Shape:** fixture Quarto projects; tests run `quarto render` and assert
  on output — figure element, caption text, crossref numbering, and
  content-hashed image path in `_site` HTML; embedded fonts in the SVG;
  PNG presence and `pdftotext`-extracted captions for PDF. Cache tests
  render twice (artifact untouched) and after a scene edit (new hash).
- **Harness:** Node's built-in `node:test` runner. Node >= 18 is already the
  extension's one hard dependency; pytest/bash/vitest would each add a
  toolchain the project doesn't otherwise need.
- **CI:** GitHub Actions on `ubuntu-latest` with `quarto-actions/setup` and
  TinyTeX for PDF jobs. PDF jobs are slow (TinyTeX install) and worth it —
  ADR 0004's rationale lives in PDF output.
- **Platforms:** ubuntu only for MVP. macOS is expected to work (same POSIX
  shell-out). Windows is a known risk (path/argument quoting when shelling
  out from Lua) — documented as a limitation; Windows CI is the first
  fast-follow after DOCX.

## Consequences

- Nothing enters the Definition of Done that CI does not exercise (ADR 0007).
- No test framework dependencies to maintain.
- Windows users are unsupported-but-documented until the fast-follow lands.
