// quarto-livefigures kroki renderer: formats with no JS renderer (PlantUML
// first) via a kroki HTTP endpoint (ADR 0012). SVG is fetched and PNG is
// rasterized locally with the shared deterministic font pipeline.
import { runCli, fail } from './cli.mjs';
import { renderKrokiSvg } from './lib/kroki.mjs';

await runCli(import.meta.url, (source, args) => {
  const type = args.type ?? fail('missing --type');
  if ((args.theme ?? 'light') !== 'light') fail(`theme=${args.theme} is not supported for ${type} figures`);
  if ((args.background ?? 'transparent') !== 'transparent') fail(`background=${args.background} is not supported for ${type} figures`);
  return renderKrokiSvg(source, { type, endpoint: args.endpoint, label: args.input });
});
