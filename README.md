# quarto-livefigures

Editable, version-controlled figures as first-class Quarto citizens.
Reference an [Excalidraw](https://excalidraw.com/) file with normal figure
syntax and `quarto render` does the rest — no manual SVG/PNG exports, no
generated files in version control.

```markdown
![Overall architecture](figures/architecture.excalidraw){#fig-arch width=80%}
```

The `.excalidraw` file is the single source of truth. Captions, labels,
cross-references, sizing, layout, subfigures, and lightbox all work exactly
as for any other Quarto figure.

## Installation

```bash
quarto add seandavi/quarto-livefigures
```

Requires **Node.js >= 18** on your PATH (the only external dependency).
Rendering is fully offline — fonts and the rasterizer ship with the
extension.

Enable the filter in `_quarto.yml` (or document front matter):

```yaml
filters:
  - livefigures
```

## Usage

Any Quarto image whose target ends in `.excalidraw` is rendered at build
time into a content-addressed cache (`_livefigures/`, add it to
`.gitignore`) and flows through Quarto's native figure pipeline:

```markdown
![Caption here](figures/workflow.excalidraw){#fig-flow width=60%}

See @fig-flow for details.
```

- **HTML formats** (articles, websites, books, dashboards, RevealJS): SVG
  with the hand-drawn fonts embedded — correct offline and in
  `embed-resources: true` documents.
- **PDF/LaTeX**: high-resolution PNG rasterized by the bundled renderer,
  so fonts are always correct (LaTeX's SVG conversion is not required or
  used).

Re-renders happen only when the scene, options, or extension version
change; otherwise the cache is reused.

### Options

Per figure (attributes) or project-wide (metadata):

| Option       | Values                              | Default                     |
| ------------ | ----------------------------------- | --------------------------- |
| `theme`      | `light`, `dark`, `auto`             | `auto` (HTML), else `light` |
| `background` | `transparent`, `scene`              | `transparent`               |

```markdown
![Dark diagram](figures/arch.excalidraw){theme=dark background=scene}
```

```yaml
livefigures:
  theme: light
  background: scene
```

`theme: auto` renders once (light) and restyles on dark pages with the same
CSS filter Excalidraw itself uses for dark mode. An explicit `theme=dark`
performs a true dark export.

## Examples

See [`examples/`](examples/) for a minimal [article](examples/article),
[book](examples/book), and [RevealJS deck](examples/revealjs).

## Limitations

- **Windows is untested** (macOS and Linux are exercised; Windows CI is a
  planned fast-follow).
- **DOCX and EPUB** are untested ("may work"); verified formats are the
  HTML family and PDF.
- **CJK text** (Excalidraw's Xiaolai font, 13 MB) is not bundled; scenes
  using it fail with a clear error. Open an issue if you need it.
- Errors are deliberate and loud: a missing Node runtime or a corrupt
  `.excalidraw` file aborts the render rather than publishing a broken
  figure.

## How it works

A Lua filter rewrites `.excalidraw` image targets to cached assets produced
by a bundled, headless Node renderer (Excalidraw's own export code + a WASM
rasterizer). Design decisions are recorded in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and
[`docs/adr/`](docs/adr/).

The name is deliberate: Excalidraw is the first backend, not the last —
the roadmap includes other editable-figure formats (see issue #7).

## Development

```bash
cd renderer && npm install && npm run build   # rebuild the committed bundle
node --test tests/test.mjs                    # end-to-end tests (needs quarto)
```
