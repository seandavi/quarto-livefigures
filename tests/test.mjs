// End-to-end tests (ADR 0008): real `quarto render` against fixture projects.
// Run: node --test tests/
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, readFileSync, writeFileSync, readdirSync, statSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const which = (cmd) => spawnSync(cmd, ['--version'], { encoding: 'utf8' }).status === 0;

let proj;
before(() => {
  proj = mkdtempSync(join(tmpdir(), 'livefigures-test-'));
  cpSync(join(ROOT, 'tests', 'fixtures', 'article'), proj, { recursive: true });
  // point the copied project at the real extension
  writeFileSync(join(proj, '_quarto.yml'),
    `project:\n  type: default\n\nfilters:\n  - ${join(ROOT, '_extensions', 'livefigures', 'livefigures.lua')}\n`);
});

const render = (args = ['--to', 'html']) =>
  execFileSync('quarto', ['render', '.', ...args], { cwd: proj, encoding: 'utf8', stdio: 'pipe' });

const cacheFiles = (ext) => readdirSync(join(proj, '_livefigures')).filter((f) => f.endsWith(ext));

test('HTML: figure semantics, hashed target, embedded fonts', () => {
  render();
  const html = readFileSync(join(proj, 'index.html'), 'utf8');
  const m = html.match(/<img src="(_livefigures\/arch-[0-9a-f]{8}\.svg)"[^>]*>/);
  assert.ok(m, 'img rewritten to content-addressed svg');
  assert.match(m[0], /class="[^"]*livefigure[^"]*"/);
  assert.match(m[0], /width:60/);
  assert.match(html, /Overall architecture/);
  assert.match(html, /Figure&nbsp;1/);
  const svg = readFileSync(join(proj, m[1]), 'utf8');
  assert.match(svg, /@font-face/);
  assert.match(svg, /data:font\/woff2;base64,/);
});

test('cache: second render reuses artifacts', () => {
  const file = join(proj, '_livefigures', cacheFiles('.svg')[0]);
  const mtime = statSync(file).mtimeMs;
  render();
  assert.equal(statSync(file).mtimeMs, mtime, 'cached svg untouched on re-render');
});

test('cache: scene edit produces a new hash', () => {
  const before_ = new Set(cacheFiles('.svg'));
  const scenePath = join(proj, 'figures', 'arch.excalidraw');
  const scene = JSON.parse(readFileSync(scenePath, 'utf8'));
  scene.elements.find((e) => e.type === 'text').text = 'hello edited';
  writeFileSync(scenePath, JSON.stringify(scene));
  render();
  const fresh = cacheFiles('.svg').filter((f) => !before_.has(f));
  assert.equal(fresh.length, 1, 'exactly one new cache entry');
  const html = readFileSync(join(proj, 'index.html'), 'utf8');
  assert.ok(html.includes(fresh[0]), 'html points at the new hash');
});

test('options: theme=dark renders and hashes separately', () => {
  writeFileSync(join(proj, 'dark.qmd'),
    '---\ntitle: dark\n---\n\n![dark](figures/flow.excalidraw){#fig-dark theme=dark}\n');
  render();
  const html = readFileSync(join(proj, 'dark.html'), 'utf8');
  const m = html.match(/<img src="(_livefigures\/flow-[0-9a-f]{8}\.svg)"/);
  assert.ok(m, 'dark figure rendered');
  const lightHtml = readFileSync(join(proj, 'index.html'), 'utf8');
  assert.ok(!lightHtml.includes(m[1]), 'dark uses a different cache entry than light');
  assert.ok(!html.includes('livefigure-auto'), 'explicit dark opts out of auto CSS');
});

test('vega backend: .vl.json renders as SVG figure without auto-dark CSS', () => {
  writeFileSync(join(proj, 'chart.qmd'),
    '---\ntitle: chart\n---\n\nSee @fig-chart.\n\n![A bar chart](figures/chart.vl.json){#fig-chart}\n');
  render();
  const html = readFileSync(join(proj, 'chart.html'), 'utf8');
  const m = html.match(/<img src="(_livefigures\/chart-[0-9a-f]{8}\.svg)"[^>]*>/);
  assert.ok(m, 'chart rewritten to content-addressed svg');
  assert.match(m[0], /class="[^"]*livefigure[^"]*"/);
  assert.ok(!m[0].includes('livefigure-auto'), 'charts do not get the CSS dark filter');
  assert.match(html, /A bar chart/);
  const svg = readFileSync(join(proj, m[1]), 'utf8');
  assert.match(svg, /<svg/);
  assert.match(svg, /alpha/, 'axis labels present');
});

test('text backends: nomnoml/wavedrom/bytefield render as SVG figures', () => {
  writeFileSync(join(proj, 'text.qmd'),
    '---\ntitle: text\n---\n\n![Pipeline](figures/pipeline.noml){#fig-p}\n\n' +
    '![Timing](figures/timing.wavedrom.json){#fig-t}\n\n![Packet](figures/packet.bytefield){#fig-b}\n');
  render();
  const html = readFileSync(join(proj, 'text.html'), 'utf8');
  for (const stem of ['pipeline', 'timing', 'packet']) {
    const m = html.match(new RegExp(`<img src="(_livefigures/${stem}-[0-9a-f]{8}\\.svg)"`));
    assert.ok(m, `${stem} rewritten to content-addressed svg`);
    assert.match(readFileSync(join(proj, m[1]), 'utf8'), /<svg/);
  }
  assert.ok(!html.includes('livefigure-auto'), 'text diagrams do not get the CSS dark filter');
});

test('text backends: theme=dark hard-fails with a clear message', () => {
  writeFileSync(join(proj, 'textdark.qmd'),
    '---\ntitle: td\n---\n\n![](figures/pipeline.noml){theme=dark}\n');
  const r = spawnSync('quarto', ['render', 'textdark.qmd'], { cwd: proj, encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /theme=dark is not supported for nomnoml/);
  rmSync(join(proj, 'textdark.qmd')); // keep later whole-project renders green
});

test('kroki backend: .puml renders as SVG figure', async (t) => {
  // probe here, not at module load: sync execFileSync in earlier tests
  // starves the event loop and falsely times out a top-level fetch
  const up = await fetch('https://kroki.io/health', { signal: AbortSignal.timeout(5000) })
    .then((r) => r.ok).catch(() => false);
  if (!up) return t.skip('kroki.io unreachable');
  writeFileSync(join(proj, 'puml.qmd'),
    '---\ntitle: puml\n---\n\n![Sequence](figures/sequence.puml){#fig-seq}\n');
  render();
  const html = readFileSync(join(proj, 'puml.html'), 'utf8');
  const m = html.match(/<img src="(_livefigures\/sequence-[0-9a-f]{8}\.svg)"/);
  assert.ok(m, 'puml rewritten to content-addressed svg');
  assert.match(readFileSync(join(proj, m[1]), 'utf8'), /<svg/);
});

test('kroki backend: unreachable endpoint hard-fails with actionable message', () => {
  writeFileSync(join(proj, 'pumlbad.qmd'),
    '---\ntitle: pb\nlivefigures:\n  kroki-url: "http://127.0.0.1:9"\n---\n\n![](figures/sequence.puml)\n');
  const r = spawnSync('quarto', ['render', 'pumlbad.qmd'], { cwd: proj, encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /could not reach kroki endpoint/);
  rmSync(join(proj, 'pumlbad.qmd'));
});

test('errors: corrupt scene aborts the render', () => {
  writeFileSync(join(proj, 'figures', 'bad.excalidraw'), '{not json');
  writeFileSync(join(proj, 'bad.qmd'), '---\ntitle: bad\n---\n\n![](figures/bad.excalidraw)\n');
  const r = spawnSync('quarto', ['render', 'bad.qmd'], { cwd: proj, encoding: 'utf8' });
  assert.notEqual(r.status, 0, 'render fails');
  assert.match(r.stderr + r.stdout, /livefigures/);
  rmSync(join(proj, 'bad.qmd'));
  rmSync(join(proj, 'figures', 'bad.excalidraw'));
});

test('PDF: renders with PNG cache entries and caption text', { skip: !which('tlmgr') && !existsSync(join(process.env.HOME ?? '', '.TinyTeX')) }, () => {
  execFileSync('quarto', ['render', 'index.qmd', '--to', 'pdf'], { cwd: proj, encoding: 'utf8', stdio: 'pipe' });
  execFileSync('quarto', ['render', 'chart.qmd', '--to', 'pdf'], { cwd: proj, encoding: 'utf8', stdio: 'pipe' });
  assert.ok(existsSync(join(proj, 'index.pdf')));
  assert.ok(cacheFiles('.png').length >= 3, 'png cache entries for latex (both backends)');
  if (which('pdftotext')) {
    execFileSync('pdftotext', ['index.pdf', 'index.txt'], { cwd: proj });
    assert.match(readFileSync(join(proj, 'index.txt'), 'utf8'), /Figure 1: Overall architecture/);
  }
});
