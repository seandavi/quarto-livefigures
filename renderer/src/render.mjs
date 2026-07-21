// quarto-livefigures renderer: .excalidraw -> SVG/PNG, headless, offline.
// Bundled by build.mjs into _extensions/livefigures/renderer.mjs; expects
// fonts/ and resvg.wasm as siblings of the bundle (ADR 0001, 0004, 0009).
import { runCli, fail } from './cli.mjs';
import { renderExcalidrawSvg } from './lib/excalidraw.mjs';

await runCli(import.meta.url, (source, args, assets) => {
  const theme = args.theme ?? 'light';
  const background = args.background ?? 'transparent';
  if (!['light', 'dark'].includes(theme)) fail(`unknown --theme "${theme}" (auto is resolved by the filter)`);
  if (!['transparent', 'scene'].includes(background)) fail(`unknown --background "${background}"`);
  return renderExcalidrawSvg(source, { theme, background, assets, label: args.input });
});
