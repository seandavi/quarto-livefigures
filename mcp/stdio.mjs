#!/usr/bin/env node
// livefigures MCP server, stdio transport (ADR 0015). Bundled into
// _extensions/livefigures/mcp.mjs, so any project that installed the
// extension has it: renders by shelling to the sibling renderer bundles —
// byte-for-byte the same output quarto render produces. Node >= 18 only.
//
// Register with Claude Code from a project root:
//   claude mcp add livefigures -- node _extensions/livefigures/mcp.mjs
import { createInterface } from 'node:readline';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMcp } from './core.mjs';
import { makeTools, INSTRUCTIONS } from './tools.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
// bundled-in-extension layout vs. repo layout
const EXT_DIR = existsSync(join(HERE, 'renderer.mjs')) ? HERE : join(HERE, '..', '_extensions', 'livefigures');

const VERSION = (/version:\s*"?([\d.]+)/.exec(readFileSync(join(EXT_DIR, '_extension.yml'), 'utf8')) ?? [])[1] ?? '0.0.0';
const SKILL_PATH = [join(EXT_DIR, 'SKILL.md'), join(HERE, '..', 'skills', 'livefigures', 'SKILL.md')].find(existsSync);

function exec(cmd, args) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    p.stderr.on('data', (d) => { stderr += d; });
    p.on('close', (code) => resolve({ code, stderr }));
    p.on('error', (e) => resolve({ code: -1, stderr: String(e.message) }));
  });
}

async function render(f, source, { output, theme, background, scale }) {
  const dir = await mkdtemp(join(tmpdir(), 'livefigures-mcp-'));
  try {
    const src = join(dir, `source.${f.exts[0]}`);
    const out = join(dir, `out.${output}`);
    await writeFile(src, source);
    const args = [join(EXT_DIR, f.renderer), '--input', src, '--output', out,
      '--format', output, '--theme', theme, '--background', background, '--scale', String(scale ?? 2)];
    if (f.krokiType) args.push('--type', f.krokiType);
    const { code, stderr } = await exec(process.execPath, args);
    if (code !== 0) {
      // strip temp paths and the CLI prefix so errors read like tool output
      throw new Error(stderr.replaceAll(dir + '/', '').replace(/^livefigures: /gm, '').trim() || `renderer exited with code ${code}`);
    }
    return output === 'svg'
      ? { text: await readFile(out, 'utf8') }
      : { base64: (await readFile(out)).toString('base64') };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
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
