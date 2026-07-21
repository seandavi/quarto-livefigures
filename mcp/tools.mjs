// The three livefigures MCP tools (ADR 0015), transport-agnostic. The
// transport supplies render(formatEntry, source, {output, theme, background,
// scale}) -> {text} for svg | {base64} for png, throwing on failure with the
// same messages quarto render surfaces.
import { FORMATS } from './formats.mjs';

const MAX_SOURCE = 2 * 1024 * 1024; // ponytail: flat cap; tune if real sources hit it

export const INSTRUCTIONS = `livefigures renders editable figure sources (Excalidraw scenes, Vega-Lite,
Graphviz, PlantUML, and more — call list_formats) with the same engines,
fonts, and options the quarto-livefigures extension uses at \`quarto render\`.
Call render (output=png, the default) to SEE a figure you wrote and fix it
before it lands in a document; validate is the cheap correctness check.

In a Quarto project the source itself is the figure — never export or commit
SVG/PNG. Two authoring forms, both with normal caption/label/crossref
behavior:
  file-referenced:  ![Caption](figures/arch.excalidraw){#fig-arch width=80%}
  inline block:     \`\`\`{.nomnoml #fig-pipe fig-cap="The pipeline"} — class
                    form WITH the leading dot ({nomnoml} without it fails)
Setup once per project in _quarto.yml (pre-ast placement is required for
crossrefs on inline blocks):
  filters:
    - at: pre-ast
      path: livefigures
Install if missing: quarto add seandavi/quarto-livefigures (Node >= 18).
Full briefing including format choice guidance: the livefigures://skill resource.`;

function lookup(id) {
  const f = FORMATS.find((x) => x.id === id);
  if (!f) throw new Error(`unknown format "${id}" — call list_formats for the supported list`);
  return f;
}

function check(f, { source, theme = 'light', background = 'transparent' }) {
  if (typeof source !== 'string' || !source.trim()) throw new Error('source must be non-empty text');
  if (source.length > MAX_SOURCE) throw new Error(`source too large (${source.length} chars, max ${MAX_SOURCE})`);
  if (theme === 'dark' && !f.dark) throw new Error(`theme=dark is not supported for ${f.id} figures`);
  if (background === 'scene' && !f.scene) throw new Error(`background=scene is not supported for ${f.id} figures`);
}

export function makeTools(render) {
  const formatProp = {
    type: 'string',
    enum: FORMATS.map((f) => f.id),
    description: 'Figure format id (see list_formats)',
  };
  const sourceProp = { type: 'string', description: 'Figure source text (DSL, spec, or scene JSON)' };

  return [
    {
      name: 'render',
      description: 'Render figure source to an image, exactly as quarto-livefigures renders it '
        + 'during quarto render (same engines, fonts, and options). Default output=png returns '
        + 'the figure as an image block so you can visually verify what you wrote; output=svg '
        + 'returns the SVG markup as text.',
      inputSchema: {
        type: 'object',
        properties: {
          format: formatProp,
          source: sourceProp,
          output: { type: 'string', enum: ['png', 'svg'], default: 'png' },
          theme: { type: 'string', enum: ['light', 'dark'], default: 'light', description: 'dark: Excalidraw/Vega only' },
          background: { type: 'string', enum: ['transparent', 'scene'], default: 'transparent', description: 'scene: Excalidraw/Vega only' },
          scale: { type: 'number', minimum: 1, maximum: 4, default: 2, description: 'PNG raster scale' },
        },
        required: ['format', 'source'],
      },
      async run(a) {
        const f = lookup(a.format);
        check(f, a);
        const output = a.output === 'svg' ? 'svg' : 'png';
        const r = await render(f, a.source, {
          output,
          theme: a.theme ?? 'light',
          background: a.background ?? 'transparent',
          scale: Math.min(4, Math.max(1, Number(a.scale) || 2)),
        });
        return output === 'svg'
          ? [{ type: 'text', text: r.text }]
          : [{ type: 'image', data: r.base64, mimeType: 'image/png' }];
      },
    },
    {
      name: 'validate',
      description: 'Check figure source without producing an image: renders to SVG and reports '
        + '"valid" or the exact error quarto render would give.',
      inputSchema: {
        type: 'object',
        properties: { format: formatProp, source: sourceProp },
        required: ['format', 'source'],
      },
      async run(a) {
        const f = lookup(a.format);
        check(f, a);
        try {
          await render(f, a.source, { output: 'svg', theme: 'light', background: 'transparent' });
          return [{ type: 'text', text: 'valid' }];
        } catch (e) {
          return [{ type: 'text', text: `invalid: ${e?.message ?? e}` }];
        }
      },
    },
    {
      name: 'list_formats',
      description: 'List the supported figure formats: id, file extensions, Quarto block class, '
        + 'what each is for, docs URL, and option/network support.',
      inputSchema: { type: 'object', properties: {} },
      run: () => [{
        type: 'text',
        text: JSON.stringify(FORMATS.map((f) => ({
          id: f.id,
          file_extensions: f.exts.map((e) => '.' + e),
          quarto_block_class: `{.${f.block}}`,
          use: f.use,
          docs: f.docs,
          needs_network: !!f.krokiType,
          supports_theme_dark: !!f.dark,
          supports_background_scene: !!f.scene,
        })), null, 1),
      }],
    },
  ];
}
