// quarto-livefigures text-diagram renderer: nomnoml (.noml), WaveDrom
// (.wavedrom/.wavedrom.json), bytefield (.bytefield) -> SVG/PNG.
// All pure JS, headless. Selected for agent fluency (ADR 0011).
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
if ((args.theme ?? 'light') !== 'light') {
  fail(`theme=${args.theme} is not supported for ${input} (text-diagram backends render light only)`);
}
if ((args.background ?? 'transparent') !== 'transparent') {
  fail(`background=${args.background} is not supported for ${input}`);
}

const source = readFileSync(input, 'utf8');
let svg;
try {
  if (/\.(noml|nomnoml)$/.test(input)) {
    const nomnoml = await import('nomnoml');
    svg = nomnoml.renderSvg(source);
  } else if (/\.wavedrom(\.json)?$/.test(input)) {
    const wavedrom = await import('wavedrom');
    const onml = await import('onml');
    svg = onml.stringify(wavedrom.renderAny(0, JSON.parse(source), wavedrom.waveSkin));
  } else if (/\.bytefield$/.test(input)) {
    const bytefield = (await import('bytefield-svg')).default;
    svg = bytefield(source);
  } else {
    fail(`unrecognized text-diagram source: ${input}`);
  }
} catch (e) {
  fail(`rendering failed for ${input}: ${e.message}`);
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
