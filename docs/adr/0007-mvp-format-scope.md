# ADR 0007: MVP verifies HTML-family and PDF; DOCX/EPUB deferred

Date: 2026-07-20
Status: Accepted

## Context

The extension should eventually work in every format Quarto supports
(Goal 3). Formats sort into tiers by mechanics: the entire HTML family
(articles, websites, books, blogs, dashboards, RevealJS) consumes one
embedded-SVG path; PDF uses the PNG path (ADR 0004); DOCX would reuse that
PNG path but needs real verification of Word's image/caption behavior; EPUB
SVG support is uneven across e-readers and expensive to verify.

## Decision

The MVP verifies and promises: HTML family (explicitly including RevealJS,
which shares the HTML code path) and PDF. DOCX and EPUB are documented as
"may work, untested" and live on the roadmap. Example projects: article,
book, RevealJS slides.

## Consequences

- One SVG code path covers every promised HTML format; RevealJS costs
  nothing extra.
- DOCX is a cheap fast-follow (rasterization already exists per ADR 0004).
- The Definition of Done stays honest: nothing is promised that CI does not
  exercise.
