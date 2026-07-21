// Local render backend shared by the CLI and the stdio MCP server: shell to
// the renderer bundles in the extension dir — byte-for-byte what
// quarto render produces (ADR 0015).
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// bundled-in-extension layout (renderer.mjs is a sibling) vs. repo/npm layout
export function findExtDir(fromUrl) {
  const here = dirname(fileURLToPath(fromUrl));
  return existsSync(join(here, 'renderer.mjs')) ? here : join(here, '..', '_extensions', 'livefigures');
}

function exec(cmd, args) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    p.stderr.on('data', (d) => { stderr += d; });
    p.on('close', (code) => resolve({ code, stderr }));
    p.on('error', (e) => resolve({ code: -1, stderr: String(e.message) }));
  });
}

// -> { text } for svg, { bytes } for png; throws with the renderer's message
export async function renderWithBundles(extDir, f, source, { output = 'svg', theme = 'light', background = 'transparent', scale = 2 } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'livefigures-'));
  try {
    const src = join(dir, `source.${f.exts[0]}`);
    const out = join(dir, `out.${output}`);
    await writeFile(src, source);
    const args = [join(extDir, f.renderer), '--input', src, '--output', out,
      '--format', output, '--theme', theme, '--background', background, '--scale', String(scale)];
    if (f.krokiType) args.push('--type', f.krokiType);
    const { code, stderr } = await exec(process.execPath, args);
    if (code !== 0) {
      // strip temp paths and the CLI prefix so errors read like tool output
      throw new Error(stderr.replaceAll(dir + '/', '').replace(/^livefigures: /gm, '').trim() || `renderer exited with code ${code}`);
    }
    return output === 'svg' ? { text: await readFile(out, 'utf8') } : { bytes: await readFile(out) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
