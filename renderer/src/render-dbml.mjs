// quarto-livefigures DBML renderer: .dbml -> SVG/PNG.
import { runCli, fail } from './cli.mjs';
import { renderDbmlSvg } from './lib/dbml.mjs';

await runCli(import.meta.url, (source, args) => {
  if ((args.theme ?? 'light') !== 'light') fail(`theme=${args.theme} is not supported for dbml figures`);
  if ((args.background ?? 'transparent') !== 'transparent') fail(`background=${args.background} is not supported for dbml figures`);
  return renderDbmlSvg(source, { label: args.input });
});
