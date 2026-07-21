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
    // explicit UA: kroki.io's Cloudflare 403s some default client UAs
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'quarto-livefigures' },
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
if (!body.includes('<svg')) {
  // some broken kroki backends return HTTP 200 with an empty/non-SVG body
  fail(`kroki (${endpoint}) returned no usable SVG for ${input} (HTTP 200, ` +
    `${body.length} bytes). The '${type}' renderer may be broken on this server.`);
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
