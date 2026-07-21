// quarto-livefigures Vega/Vega-Lite renderer: .vl.json/.vg.json -> SVG/PNG.
import { runCli } from './cli.mjs';
import { renderVegaSvg } from './lib/vega.mjs';

await runCli(import.meta.url, (source, args) => renderVegaSvg(source, {
  kind: args.input.endsWith('.vl.json') ? 'vega-lite' : undefined,
  theme: args.theme ?? 'light',
  background: args.background ?? 'transparent',
  label: args.input,
}));
