# ADR 0013: Inline code-block figures via `{.backend}` classes at pre-ast

Date: 2026-07-20
Status: Accepted

## Context

File-referenced figures trade locality for reuse. For a four-line nomnoml
sketch, an inline fenced block in the document is more ergonomic — and for
agents, one file to edit. Users coming from Quarto's native Mermaid also
expect code-block diagrams.

## Decision

Fenced code blocks with a backend class render through the existing
pipeline and become figures:

    ```{.nomnoml #fig-pipe fig-cap="The pipeline"}
    [Filter] -> [Cache]
    ```

- **Class form (`{.nomnoml}`), not engine form (`{nomnoml}`)**: the
  brace-without-dot syntax is Quarto's executable-engine namespace (errors
  on unknown engines); the class form is a plain Pandoc code block that
  reaches filters untouched.
- Caption/label/options as block attributes (`#fig-x`, `fig-cap`
  (markdown supported), `theme=`, `background=`). Labeled/captioned blocks
  become pandoc `Figure` nodes; bare blocks become plain images.
- Block classes map to backends in the registry (`block` field); inline
  sources are content-addressed into the same cache (a `.in.<ext>` file is
  written beside the output on cache miss, since renderers sniff type from
  the input extension).

## The pre-ast requirement

Quarto indexes cross-references in an AST phase that runs BEFORE
default-placed user filters. File-referenced figures survive this (the
implicit Figure already exists at indexing time; we only swap its target
— which is also why ADR 0002's "runs early" claim worked despite being
wrong about ordering). Synthesized Figures from code blocks do not: they
appear after indexing and render as `?@fig-x`.

Therefore the documented install form is:

    filters:
      - at: pre-ast
        path: livefigures

`_extension.yml` `contributes.filters` accepts only strings (verified:
YAML validation rejects the `at:` object form), so the phase cannot be
declared extension-side. The plain `filters: [livefigures]` form still
works for file-referenced figures only.

## Consequences

- Both figure modes share one pipeline, cache, and options surface;
  identical inline source across documents shares a cache entry.
- One extra YAML line for all users; documented as the single recommended
  form to avoid a confusing works-except-crossrefs failure mode.
- Version 0.5.0.
