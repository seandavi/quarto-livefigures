// quarto-livefigures Graphviz renderer: .dot/.gv -> SVG/PNG.
import { runCli, fail } from './cli.mjs';
import { renderGraphvizSvg } from './lib/graphviz.mjs';

await runCli(import.meta.url, (source, args) => {
  if ((args.theme ?? 'light') !== 'light') fail(`theme=${args.theme} is not supported for graphviz figures`);
  if ((args.background ?? 'transparent') !== 'transparent') fail(`background=${args.background} is not supported for graphviz figures`);
  return renderGraphvizSvg(source, { label: args.input });
});
