#!/usr/bin/env node
// livefigures MCP server, stdio transport (ADR 0015). Bundled into
// _extensions/livefigures/mcp.mjs, so any project that installed the
// extension has it: renders by shelling to the sibling renderer bundles —
// byte-for-byte the same output quarto render produces. Node >= 18 only.
//
// Register with Claude Code from a project root:
//   claude mcp add livefigures -- node _extensions/livefigures/mcp.mjs
import { createInterface } from 'node:readline';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMcp } from './core.mjs';
import { makeTools, INSTRUCTIONS } from './tools.mjs';
import { findExtDir, renderWithBundles } from './local-render.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT_DIR = findExtDir(import.meta.url);

const VERSION = (/version:\s*"?([\d.]+)/.exec(readFileSync(join(EXT_DIR, '_extension.yml'), 'utf8')) ?? [])[1] ?? '0.0.0';
const SKILL_PATH = [join(EXT_DIR, 'SKILL.md'), join(HERE, '..', 'skills', 'livefigures', 'SKILL.md')].find(existsSync);

async function render(f, source, opts) {
  const r = await renderWithBundles(EXT_DIR, f, source, opts);
  return r.text !== undefined ? { text: r.text } : { base64: r.bytes.toString('base64') };
}

const handle = createMcp({
  name: 'livefigures',
  version: VERSION,
  instructions: INSTRUCTIONS,
  tools: makeTools(render),
  resources: [{
    uri: 'livefigures://skill',
    name: 'livefigures agent skill',
    description: 'Full authoring briefing: syntax, format choice, options, failure modes',
    mimeType: 'text/markdown',
    text: () => SKILL_PATH ? readFileSync(SKILL_PATH, 'utf8') : 'SKILL.md not found in this install.',
  }],
});

const rl = createInterface({ input: process.stdin });
rl.on('line', async (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }) + '\n');
    return;
  }
  const res = await handle(msg);
  if (res) process.stdout.write(JSON.stringify(res) + '\n');
});
