# ADR 0003: Content-addressed cache in a gitignored `_livefigures/` directory

Date: 2026-07-20
Status: Accepted

## Context

Generated SVG/PNG assets are build artifacts (Goal 5): they must not be
hand-maintained or committed, and re-rendering should only happen when
inputs change (Goal 6).

## Decision

- **Location:** a project-root `_livefigures/` directory. The leading
  underscore keeps Quarto from treating its contents as render inputs. For
  standalone (non-project) renders, fall back to a sibling directory of the
  document.
- **Cache key = filename:** content-addressed as `<basename>-<hash8>.<ext>`,
  where the hash is SHA-256 over scene file bytes + normalized rendering
  options + extension version. File existence is the cache hit; there is no
  manifest and no timestamp logic. Any change to scene, options, or extension
  produces a new filename, so invalidation is structural.
- **Version control:** the directory is gitignored. Documentation and example
  projects ship the `.gitignore` entry.

## Consequences

- Incremental rendering (Goal 6) and deterministic builds follow from
  content addressing; no invalidation code exists to have bugs.
- Stale hashes accumulate until the user deletes `_livefigures/`. Garbage
  collection is deliberately not built (ponytail: delete-the-dir is the GC;
  add real cleanup only if users report pain).
- Spike must verify Quarto copies/inlines images referenced from an
  underscore directory into `_site` and self-contained output — path
  handling is the likeliest gotcha of this layout.
