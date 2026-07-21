// Shared CLI plumbing for the renderer entrypoints the Lua filter shells to
// (contract: --input --output --format --theme --background [--scale ...]).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { nodeAssets } from './lib/assets-node.mjs';
import { rasterize } from './lib/rasterize.mjs';

export function fail(msg) {
  console.error(`livefigures: ${msg}`);
  process.exit(1);
}

// entryUrl must be the wrapper's import.meta.url: after bundling it resolves
// to the bundle's location in _extensions/livefigures/, where fonts/ and
// resvg.wasm live (ADR 0001, 0009).
export async function runCli(entryUrl, render) {
  const args = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
  }
  const input = args.input ?? fail('missing --input');
  const output = args.output ?? fail('missing --output');
  const format = args.format ?? 'svg';
  if (!['svg', 'png'].includes(format)) fail(`unknown --format "${format}"`);

  const assets = nodeAssets(dirname(fileURLToPath(entryUrl)));
  let source;
  try {
    source = readFileSync(input, 'utf8');
  } catch (e) {
    fail(`cannot read ${input} (${e.message})`);
  }

  let svg;
  try {
    svg = await render(source, args, assets);
  } catch (e) {
    fail(e.message);
  }

  if (format === 'svg') {
    writeFileSync(output, svg);
    return;
  }
  try {
    writeFileSync(output, await rasterize(svg, { assets, scale: Number(args.scale ?? 3) }));
  } catch (e) {
    fail(`PNG rasterization failed for ${input}: ${e.message}`);
  }
}
