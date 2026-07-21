// quarto-livefigures Vega/Vega-Lite renderer: .vl.json/.vg.json -> SVG/PNG.
// Pure Node, no DOM needed — vega renders headless with renderer:'none'
// (text measurement falls back to built-in metrics; 'canvas' is external).
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
const theme = args.theme ?? 'light';
const background = args.background ?? 'transparent';

let spec;
try {
  spec = JSON.parse(readFileSync(input, 'utf8'));
} catch (e) {
  fail(`${input} is not valid JSON (${e.message})`);
}

const vega = await import('vega');
const isVegaLite = /vega-lite/.test(spec.$schema ?? '') || input.endsWith('.vl.json');

const config = {};
if (theme === 'dark') {
  const themes = await import('vega-themes');
  Object.assign(config, themes.dark);
}
if (background === 'transparent') {
  config.background = 'transparent';
}

let vgSpec = spec;
if (isVegaLite) {
  const { compile } = await import('vega-lite');
  try {
    vgSpec = compile(spec, { config }).spec;
  } catch (e) {
    fail(`vega-lite compilation failed for ${input}: ${e.message}`);
  }
}

let svg;
try {
  const runtime = vega.parse(vgSpec, isVegaLite ? undefined : config);
  svg = await new vega.View(runtime, { renderer: 'none' }).toSVG();
} catch (e) {
  fail(`vega rendering failed for ${input}: ${e.message}`);
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
