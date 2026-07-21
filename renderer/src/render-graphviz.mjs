// quarto-livefigures Graphviz renderer: .dot/.gv -> SVG/PNG via
// @hpcc-js/wasm-graphviz (wasm embedded in the bundle; fully offline).
// Fills the file-referenced gap Quarto's code-cell dot support leaves open.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { rasterize } from './rasterize.mjs';

function fail(msg) {
  console.error(`livefigures: ${msg}`);
  process.exit(1);
}

const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
}
const input = args.input ?? fail('missing --input');
const output = args.output ?? fail('missing --output');
const format = args.format ?? 'svg';
if ((args.theme ?? 'light') !== 'light') fail(`theme=${args.theme} is not supported for graphviz figures`);
if ((args.background ?? 'transparent') !== 'transparent') fail(`background=${args.background} is not supported for graphviz figures`);

const source = readFileSync(input, 'utf8');

let svg;
try {
  const { Graphviz } = await import('@hpcc-js/wasm-graphviz');
  const gv = await Graphviz.load();
  svg = gv.dot(source);
} catch (e) {
  fail(`graphviz rendering failed for ${input}: ${e.message}`);
}

if (format === 'svg') {
  writeFileSync(output, svg);
} else {
  const extDir = dirname(fileURLToPath(import.meta.url));
  try {
    writeFileSync(output, await rasterize(svg, { extDir, scale: Number(args.scale ?? 3) }));
  } catch (e) {
    fail(`PNG rasterization failed for ${input}: ${e.message}`);
  }
}
