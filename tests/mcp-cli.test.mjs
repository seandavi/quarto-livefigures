// CLI + stdio MCP server, driven end-to-end against the committed bundles
// (ADR 0015). Fast: no quarto involved.
import { test } from 'node:test';
import assert from 'node:assert';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createInterface } from 'node:readline';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, '..', 'cli', 'livefigures.mjs');
const FIX = join(HERE, 'fixtures', 'article', 'figures');
const run = promisify(execFile);

test('CLI: formats lists 17 (text and json agree)', async () => {
  const { stdout } = await run(process.execPath, [CLI, 'formats']);
  assert.equal(stdout.trim().split('\n').length, 17);
  const { stdout: js } = await run(process.execPath, [CLI, 'formats', '--json']);
  assert.equal(JSON.parse(js).length, 17);
});

test('CLI: render infers format and writes SVG to stdout', async () => {
  const { stdout } = await run(process.execPath, [CLI, 'render', join(FIX, 'deps.dot')]);
  assert.match(stdout, /<svg/);
});

test('CLI: render from stdin with --format', async () => {
  const p = spawn(process.execPath, [CLI, 'render', '-', '--format', 'nomnoml']);
  p.stdin.end('[a] -> [b]');
  let out = '';
  for await (const c of p.stdout) out += c;
  assert.match(out, /<svg/);
});

test('CLI: validate mixes ok and invalid, exits 1', async () => {
  const err = await run(process.execPath, [CLI, 'validate', join(FIX, 'deps.dot'), join(FIX, '..', 'index.qmd'), '--format', 'graphviz'])
    .then(() => null, (e) => e);
  assert.ok(err, 'expected nonzero exit');
  assert.match(err.stdout, /ok      .*deps\.dot/);
  assert.match(err.stdout, /invalid .*index\.qmd/);
});

test('stdio MCP server: initialize, render image, skill resource', async () => {
  const p = spawn(process.execPath, [join(HERE, '..', 'mcp', 'stdio.mjs')], { stdio: ['pipe', 'pipe', 'inherit'] });
  const rl = createInterface({ input: p.stdout });
  const pending = new Map();
  rl.on('line', (l) => {
    const m = JSON.parse(l);
    pending.get(m.id)?.(m);
  });
  let seq = 0;
  const rpc = (method, params) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, resolve);
    const t = setTimeout(() => reject(new Error(`timeout: ${method}`)), 30000);
    pending.set(id, (m) => { clearTimeout(t); resolve(m); });
    p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
  try {
    const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '0' } });
    assert.equal(init.result.serverInfo.name, 'livefigures');
    const tools = await rpc('tools/list');
    assert.deepEqual(tools.result.tools.map((t) => t.name).sort(), ['list_formats', 'render', 'validate']);
    const img = await rpc('tools/call', { name: 'render', arguments: { format: 'nomnoml', source: '[x]->[y]' } });
    assert.equal(img.result.content[0].type, 'image');
    assert.equal(img.result.content[0].mimeType, 'image/png');
    const bad = await rpc('tools/call', { name: 'render', arguments: { format: 'graphviz', source: 'digraph{a}', theme: 'dark' } });
    assert.ok(bad.result.isError);
    const skill = await rpc('resources/read', { uri: 'livefigures://skill' });
    assert.match(skill.result.contents[0].text, /quarto-livefigures/);
  } finally {
    p.kill();
  }
});
