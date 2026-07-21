// quarto-livefigures kroki renderer: formats with no JS renderer (PlantUML
// first) via a kroki HTTP endpoint (ADR 0012). Network-dependent by nature;
// endpoint configurable for self-hosting. SVG is fetched and PNG is
// rasterized locally with the shared deterministic font pipeline.
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
const type = args.type ?? fail('missing --type');
const endpoint = (args.endpoint ?? 'https://kroki.io').replace(/\/$/, '');
if ((args.theme ?? 'light') !== 'light') fail(`theme=${args.theme} is not supported for ${type} figures`);
if ((args.background ?? 'transparent') !== 'transparent') fail(`background=${args.background} is not supported for ${type} figures`);

const source = readFileSync(input, 'utf8');

let res;
try {
  res = await fetch(endpoint + '/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diagram_source: source, diagram_type: type, output_format: 'svg' }),
  });
} catch (e) {
  fail(`could not reach kroki endpoint ${endpoint} for ${input} (${e.cause?.code ?? e.message}). ` +
    `This backend requires network access, or set a self-hosted endpoint via ` +
    `'livefigures: kroki-url: <url>' in your metadata.`);
}
const body = await res.text();
if (!res.ok) {
  fail(`kroki (${endpoint}) rejected ${input}: HTTP ${res.status} — ${body.slice(0, 300)}`);
}

if (format === 'svg') {
  writeFileSync(output, body);
} else {
  const extDir = dirname(fileURLToPath(import.meta.url));
  try {
    writeFileSync(output, await rasterize(body, { extDir, scale: Number(args.scale ?? 3) }));
  } catch (e) {
    fail(`PNG rasterization failed for ${input}: ${e.message}`);
  }
}
