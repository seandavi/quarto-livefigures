// quarto-livefigures text-diagram renderer: nomnoml (.noml), WaveDrom
// (.wavedrom/.wavedrom.json), bytefield (.bytefield) -> SVG/PNG.
import { runCli, fail } from './cli.mjs';
import { renderTextDiagramSvg } from './lib/text.mjs';

await runCli(import.meta.url, (source, args) => {
  const input = args.input;
  if ((args.theme ?? 'light') !== 'light') {
    fail(`theme=${args.theme} is not supported for ${input} (text-diagram backends render light only)`);
  }
  if ((args.background ?? 'transparent') !== 'transparent') {
    fail(`background=${args.background} is not supported for ${input}`);
  }
  const kind = /\.(noml|nomnoml)$/.test(input) ? 'nomnoml'
    : /\.wavedrom(\.json)?$/.test(input) ? 'wavedrom'
    : /\.bytefield$/.test(input) ? 'bytefield'
    : fail(`unrecognized text-diagram source: ${input}`);
  return renderTextDiagramSvg(source, { kind, label: input });
});
