#!/usr/bin/env node
// livefigures CLI (ADR 0015): the MCP tools as commands. Renders with the
// extension's own bundles, so output is byte-for-byte what quarto render
// produces. Zero deps; Node >= 18.
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { FORMATS } from '../mcp/formats.mjs';
import { findExtDir, renderWithBundles } from '../mcp/local-render.mjs';

const EXT_DIR = findExtDir(import.meta.url);
const VERSION = (/version:\s*"?([\d.]+)/.exec(readFileSync(join(EXT_DIR, '_extension.yml'), 'utf8')) ?? [])[1] ?? '0.0.0';

const HELP = `livefigures ${VERSION} — editable, version-controlled figures (https://livefigures.seandavis.net)

Usage:
  livefigures render <input> [-o <out>] [options]   render a figure source
  livefigures validate <input>...                   check sources; exit 1 on any error
  livefigures formats [--json]                      list supported formats
  livefigures mcp                                   run the MCP server (stdio)

Render options:
  -o, --output <file>    output file (extension picks svg/png); default: SVG to stdout
      --to svg|png       output type (overrides -o extension)
      --format <id>      figure format id; required for stdin, else inferred
                         from the input extension (see: livefigures formats)
      --theme light|dark            (dark: Excalidraw/Vega only)
      --background transparent|scene (scene: Excalidraw/Vega only)
      --scale <n>        PNG raster scale (default 2)

Examples:
  livefigures render figures/arch.excalidraw -o arch.png
  echo 'digraph { a -> b }' | livefigures render - --format graphviz > g.svg
  livefigures validate figures/*.dot
`;

function die(msg) {
  console.error(`livefigures: ${msg}`);
  process.exit(1);
}

function formatFor(path, id) {
  if (id) return FORMATS.find((f) => f.id === id) ?? die(`unknown format "${id}" (see: livefigures formats)`);
  const f = FORMATS.find((x) => x.exts.some((e) => path.endsWith('.' + e)));
  return f ?? die(`cannot infer format from "${path}" — pass --format <id> (see: livefigures formats)`);
}

function readSource(path) {
  try {
    return path === '-' ? readFileSync(0, 'utf8') : readFileSync(path, 'utf8');
  } catch (e) {
    die(`cannot read ${path} (${e.message})`);
  }
}

async function cmdRender(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      output: { type: 'string', short: 'o' },
      to: { type: 'string' },
      format: { type: 'string' },
      theme: { type: 'string', default: 'light' },
      background: { type: 'string', default: 'transparent' },
      scale: { type: 'string', default: '2' },
    },
  });
  const input = positionals[0] ?? die('render needs an input file (or - for stdin)');
  if (input === '-' && !values.format) die('stdin input needs --format <id>');
  const f = formatFor(input, values.format);
  const to = values.to ?? (values.output?.endsWith('.png') ? 'png' : 'svg');
  if (!['svg', 'png'].includes(to)) die(`unknown --to "${to}" (svg or png)`);
  const r = await renderWithBundles(EXT_DIR, f, readSource(input), {
    output: to, theme: values.theme, background: values.background, scale: Number(values.scale) || 2,
  }).catch((e) => die(e.message));
  const data = r.text ?? r.bytes;
  if (values.output) {
    await writeFile(values.output, data);
  } else if (r.bytes && process.stdout.isTTY) {
    die('refusing to write PNG to a terminal — use -o <file> or pipe the output');
  } else {
    process.stdout.write(data);
  }
}

async function cmdValidate(argv) {
  const { values, positionals } = parseArgs({
    args: argv, allowPositionals: true,
    options: { format: { type: 'string' } },
  });
  if (!positionals.length) die('validate needs at least one input file');
  let failed = false;
  for (const input of positionals) {
    const f = formatFor(input, values.format);
    try {
      await renderWithBundles(EXT_DIR, f, readSource(input), { output: 'svg' });
      console.log(`ok      ${input}`);
    } catch (e) {
      failed = true;
      console.log(`invalid ${input}: ${e.message}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

function cmdFormats(argv) {
  if (argv.includes('--json')) {
    console.log(JSON.stringify(FORMATS.map((f) => ({
      id: f.id,
      file_extensions: f.exts.map((e) => '.' + e),
      quarto_block_class: `{.${f.block}}`,
      use: f.use,
      docs: f.docs,
      needs_network: !!f.krokiType,
      supports_theme_dark: !!f.dark,
      supports_background_scene: !!f.scene,
    })), null, 2));
    return;
  }
  const rows = FORMATS.map((f) => [f.id, f.exts.map((e) => '.' + e).join(' '), f.krokiType ? 'kroki' : 'local', f.use]);
  const w = [0, 1].map((i) => Math.max(...rows.map((r) => r[i].length)));
  for (const r of rows) console.log(`${r[0].padEnd(w[0])}  ${r[1].padEnd(w[1])}  ${r[2].padEnd(5)}  ${r[3]}`);
}

const [cmd, ...rest] = process.argv.slice(2);
switch (cmd) {
  case 'render': await cmdRender(rest); break;
  case 'validate': await cmdValidate(rest); break;
  case 'formats': cmdFormats(rest); break;
  case 'mcp': await import('../mcp/stdio.mjs'); break;
  case '--version': case '-v': console.log(VERSION); break;
  case undefined: case '--help': case '-h': case 'help': console.log(HELP); break;
  default: die(`unknown command "${cmd}"\n\n${HELP}`);
}
