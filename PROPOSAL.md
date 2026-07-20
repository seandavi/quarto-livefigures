# quarto-livefigures

## Bringing editable, version-controlled figures to Quarto as first-class publishing artifacts

## Mission

Develop a Quarto extension that enables **editable, version-controlled figures** to become first-class citizens within the Quarto ecosystem.

The initial implementation will support **Excalidraw** as the first figure backend, allowing authors to reference `.excalidraw` files directly from Quarto documents without manually exporting SVG or PNG files.

The long-term vision is broader than Excalidraw. The extension should establish an architecture that can eventually support multiple editable figure systems while preserving Quarto's existing figure semantics and publishing workflow.

This project is intentionally named **quarto-livefigures** rather than `quarto-excalidraw` because the underlying concept is **live, editable figures** whose source remains under version control. Excalidraw is simply the first implementation of that concept.

---

# Problem Statement

Today, Quarto users typically embed static images.

```text
diagram.svg
diagram.png
```

or generate figures through executable code.

```python
plot(...)
```

Excalidraw and similar tools occupy an awkward middle ground:

* they have editable source files
* they generate static outputs
* they require manual export
* generated files often become stale
* version control tracks both source and generated artifacts

This creates unnecessary friction and discourages reproducible figure workflows.

The goal of this project is to eliminate the manual export step and allow editable figures to participate naturally in Quarto's rendering pipeline.

---

# Vision

A Quarto project should look like this:

```text
paper.qmd

slides.qmd

figures/
    architecture.excalidraw
    workflow.excalidraw
    ontology.excalidraw
```

The author writes

```markdown
![Overall architecture](figures/architecture.excalidraw){#fig-arch width=80%}
```

and simply runs

```bash
quarto render
```

No exported SVGs are maintained manually.

No generated PNGs are checked into version control.

The `.excalidraw` file is the canonical source.

---

# Primary Goals

## Goal 1 — Native Figure Support

Authors should be able to reference `.excalidraw` files directly using normal Quarto figure syntax.

Examples include

```markdown
![](architecture.excalidraw)
```

or

```markdown
![Architecture](architecture.excalidraw){#fig-arch}
```

No bespoke syntax should be required unless Quarto's architecture makes it clearly preferable.

---

## Goal 2 — Preserve Existing Figure Semantics

The extension should integrate with Quarto's existing figure pipeline rather than creating a parallel figure system.

Standard features should continue to work automatically.

Including:

* captions
* labels
* cross references
* width
* height
* layout
* subfigures
* figure positioning
* lightbox
* HTML/PDF rendering

The ideal user experience is that an Excalidraw figure behaves exactly like any other Quarto figure.

---

## Goal 3 — Support All Quarto Document Types

This is **not** a presentation extension.

It is a figure extension.

The extension should work wherever Quarto supports figures, including:

* articles
* books
* websites
* blogs
* dashboards
* RevealJS presentations
* HTML documents
* PDF documents

The same figure source should render appropriately in every output format.

---

## Goal 4 — Output-Specific Rendering

Rendering should depend on the target format.

Suggested defaults:

| Output   | Rendering                                          |
| -------- | -------------------------------------------------- |
| HTML     | Embedded SVG (fonts embedded, works offline)       |
| RevealJS | Embedded SVG                                       |
| PDF      | SVG converted for LaTeX consumption (see below)    |
| DOCX     | PNG export                                         |
| EPUB     | SVG export                                         |

Note: LaTeX does not consume SVG directly. The PDF path must either export
PDF/PNG directly or document the `rsvg-convert` dependency that Quarto uses
for SVG conversion.

An interactive Excalidraw viewer for HTML/RevealJS is a roadmap item, not
MVP. An `<iframe>`-based embed is an acceptable quick first version of it.

Rendering options that must exist from the start (as image attributes and/or
document metadata):

* `theme` — light/dark, ideally responsive to Quarto's dark mode
* `background` — transparent vs. scene background

Alternative approaches are acceptable if they better align with Quarto's architecture.

---

## Goal 5 — Single Source of Truth

The only source artifact should be

```text
figure.excalidraw
```

Generated assets are implementation details.

Users should never be expected to maintain

```text
figure.svg
figure.png
```

manually.

---

## Goal 6 — Incremental Rendering

Rendering should only occur when necessary.

Cache invalidation should depend upon:

* Excalidraw file contents
* rendering options
* renderer version
* extension version

Otherwise cached renderings should be reused.

---

## Goal 7 — Standard Installation

The extension should install using normal Quarto extension mechanisms.

For example

```bash
quarto add USER/quarto-livefigures
```

---

# Architectural Goals

These goals intentionally describe architecture rather than features.

## Design for Future Figure Engines

The MVP only needs to support Excalidraw.

However, the internal architecture should avoid unnecessary coupling to Excalidraw.

Where practical, separate

* Quarto integration
* dependency tracking
* caching
* rendering
* metadata extraction

from any Excalidraw-specific implementation.

The objective is not to implement multiple backends today.

The objective is to avoid making future backends unnecessarily difficult.

Potential future engines include:

* Excalidraw
* tldraw
* draw.io
* Mermaid
* Graphviz
* PlantUML
* Vega-Lite
* Observable notebooks

The MVP should remain focused exclusively on Excalidraw.

---

## Prefer Existing Quarto Mechanisms

Investigate Quarto before designing new abstractions.

Possible implementation mechanisms include

* Lua filters
* Pandoc AST transforms
* Quarto extensions
* shortcodes
* execution engines

The implementation should feel like a natural extension of Quarto rather than a parallel framework.

---

## Preserve Native Syntax

Where possible, existing image syntax should continue to work.

For example

```markdown
![](architecture.excalidraw){#fig-arch width=80%}
```

is preferable to inventing an entirely new directive.

If Quarto's internals suggest a different approach, document the reasoning.

---

## Deterministic Builds

Given identical

* source
* extension version
* rendering options

the output should be identical.

Generated assets should be treated as build artifacts rather than source files.

---

# Non-goals

The extension should **not**:

* become an Excalidraw editor
* replace presentation software
* replace Mermaid
* implement collaborative editing
* require users to manually export figures
* optimize prematurely for future backends at the expense of a clean MVP

---

# Research Tasks

Before implementation, investigate:

## Quarto

Determine the most idiomatic integration point.

Document the alternatives considered.

Explain why the chosen implementation best fits Quarto's architecture.

---

## Excalidraw

Investigate

* official embedding API
* official export API
* npm packages
* React viewer
* SVG export
* PNG export
* licensing
* caching opportunities

---

## Existing Projects

Determine whether similar work already exists.

Investigate:

* Quarto extensions
* Pandoc filters
* RevealJS plugins
* VS Code workflows
* Obsidian Excalidraw integration

Document opportunities for reuse.

---

# Deliverables

The completed project should include:

## 1. Architecture Document

Describe:

* extension architecture
* rendering pipeline
* dependency tracking
* cache design
* tradeoffs
* future extensibility

---

## 2. Working MVP

Support:

```markdown
![](figure.excalidraw)
```

for

* HTML
* PDF

with normal figure behavior.

---

## 3. Automated Tests

Include tests covering:

* captions
* labels
* cross references
* sizing
* cache invalidation
* incremental rebuilds
* HTML rendering
* PDF rendering

---

## 4. Example Project

Provide example Quarto projects demonstrating:

* article
* book
* RevealJS slides

using native `.excalidraw` figures.

---

## 5. Documentation

Include:

* installation
* supported syntax
* examples
* implementation notes
* limitations
* roadmap

---

# Definition of Done

The project is complete when:

* `.excalidraw` files can be referenced directly from Quarto.
* Existing Quarto figure syntax works naturally.
* Captions, labels, and cross-references work.
* HTML and PDF rendering work automatically.
* Manual SVG export is no longer required.
* Incremental rendering functions correctly.
* The extension installs through the normal Quarto extension mechanism.
* Documentation and examples are sufficient for adoption.
* The architecture cleanly separates Quarto integration from Excalidraw-specific rendering.
* Fonts are embedded in generated SVGs: output renders correctly offline and in PDF.
* `theme` and `background` rendering options work, including sensible behavior in dark-mode HTML themes.
* Output is correct with `embed-resources: true` (self-contained HTML).
* External runtime dependencies (e.g. Node, `rsvg-convert` for PDF) are documented, and a missing dependency fails with a clear, actionable error message.

---

# Autonomy Guidance

This proposal intentionally specifies the **desired user experience**, **architectural principles**, and **definition of success**, but **not the implementation**.

The implementing agent is expected to investigate Quarto's internals before coding and make independent architectural decisions.

If the agent concludes that a different implementation strategy is substantially more idiomatic than anticipated here, it should adopt that approach and document the rationale using an ADR (Architecture Decision Record).

Favor long-term maintainability, alignment with Quarto's philosophy, and minimal user-facing complexity over faithfully implementing the assumptions in this document.

---

# Useful References

**Quarto Extensions**
[https://quarto.org/docs/extensions/](https://quarto.org/docs/extensions/)

**Creating Quarto Extensions**
[https://quarto.org/docs/extensions/creating.html](https://quarto.org/docs/extensions/creating.html)

**Lua Filters**
[https://quarto.org/docs/extensions/lua.html](https://quarto.org/docs/extensions/lua.html)

**Pandoc Lua Filters**
[https://pandoc.org/lua-filters.html](https://pandoc.org/lua-filters.html)

**Excalidraw Documentation**
[https://docs.excalidraw.com/](https://docs.excalidraw.com/)

**Embedding Excalidraw**
[https://docs.excalidraw.com/docs/@excalidraw/excalidraw/integration](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/integration)

**Excalidraw GitHub**
[https://github.com/excalidraw/excalidraw](https://github.com/excalidraw/excalidraw)

