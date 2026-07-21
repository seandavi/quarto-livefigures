// quarto-livefigures renderer: .excalidraw -> SVG/PNG, headless, offline.
// Bundled by build.mjs into _extensions/livefigures/renderer.mjs; expects
// fonts/ and resvg.wasm as siblings of the bundle (ADR 0001, 0004, 0009).
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

function fail(msg) {
  console.error(`livefigures: ${msg}`);
  process.exit(1);
}

// --- argument parsing -------------------------------------------------------
const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
}
const input = args.input ?? fail('missing --input');
const output = args.output ?? fail('missing --output');
const format = args.format ?? 'svg';
const theme = args.theme ?? 'light';
const background = args.background ?? 'transparent';
const scale = Number(args.scale ?? 3);
if (!['svg', 'png'].includes(format)) fail(`unknown --format "${format}"`);
if (!['light', 'dark'].includes(theme)) fail(`unknown --theme "${theme}" (auto is resolved by the filter)`);
if (!['transparent', 'scene'].includes(background)) fail(`unknown --background "${background}"`);

const HERE = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = join(HERE, 'fonts');

// --- scene ------------------------------------------------------------------
let scene;
try {
  scene = JSON.parse(readFileSync(input, 'utf8'));
} catch (e) {
  fail(`${input} is not valid Excalidraw JSON (${e.message})`);
}
if (scene.type !== 'excalidraw' || !Array.isArray(scene.elements)) {
  fail(`${input} is not an Excalidraw scene (missing type/elements)`);
}

// --- headless DOM shims (validated in the ADR 0001 spike) -------------------
const { Window } = await import('happy-dom');
const win = new Window();
for (const k of Object.getOwnPropertyNames(win)) {
  if (k in globalThis) continue;
  try { const v = win[k]; if (v !== undefined) globalThis[k] = v; } catch { /* getters may throw */ }
}
globalThis.window = win;
globalThis.document = win.document;

// SVG export uses canvas only for text measurement.
const ctx2d = {
  filter: '', font: '10px sans-serif',
  measureText: (t) => ({ width: t.length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
  save() {}, restore() {}, scale() {}, translate() {}, clearRect() {}, fillRect() {},
  fillText() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {},
  getImageData: () => ({ data: [] }), setTransform() {}, drawImage() {}, canvas: null,
};
win.HTMLCanvasElement.prototype.getContext = function () { ctx2d.canvas = this; return ctx2d; };

class FontFaceShim {
  constructor(family, source, descriptors = {}) {
    Object.assign(this, {
      family, source, status: 'unloaded',
      style: 'normal', weight: '400', stretch: 'normal',
      unicodeRange: 'U+0-10FFFF', display: 'auto', featureSettings: 'normal',
      ...descriptors,
    });
  }
  load() { this.status = 'loaded'; return Promise.resolve(this); }
}
globalThis.FontFace = FontFaceShim;

// Serve font assets from the extension's fonts/ dir; never touch the network
// (offline determinism — verified byte-identical in the spike).
globalThis.EXCALIDRAW_ASSET_PATH = 'https://livefigures.invalid/';
globalThis.fetch = async (url) => {
  const u = String(url?.url ?? url);
  const m = u.match(/fonts\/([^?#]+\.woff2)/);
  if (m) {
    const file = join(FONTS_DIR, m[1]);
    if (!existsSync(file)) {
      // ponytail: CJK (Xiaolai) is not bundled (13 MB); documented limitation.
      fail(`font asset ${m[1]} is not bundled with quarto-livefigures (CJK text is not yet supported)`);
    }
    return new Response(readFileSync(file), { status: 200, headers: { 'Content-Type': 'font/woff2' } });
  }
  fail(`unexpected network request during render: ${u}`);
};

// --- export -----------------------------------------------------------------
const { exportToSvg } = await import('@excalidraw/excalidraw');

let svgEl;
try {
  svgEl = await exportToSvg({
    elements: scene.elements,
    appState: {
      ...scene.appState,
      exportBackground: background === 'scene',
      exportWithDarkMode: theme === 'dark',
      exportEmbedScene: false,
    },
    files: scene.files ?? null,
  });
} catch (e) {
  fail(`Excalidraw export failed for ${input}: ${e.message}`);
}
const svg = svgEl.outerHTML;

if (format === 'svg') {
  writeFileSync(output, svg);
  process.exit(0);
}

// --- PNG via resvg-wasm with explicit TTF font buffers (ADR 0004) -----------
// The napi binding's fontBuffers renders wrong glyphs (resvg-js 2.6.2); the
// wasm build is correct — verified in the spike.
const { initWasm, Resvg } = await import('@resvg/resvg-wasm');
await initWasm(readFileSync(join(HERE, 'resvg.wasm')));

const ttfDir = join(FONTS_DIR, 'ttf');
const fontBuffers = readdirSync(ttfDir)
  .filter((f) => f.endsWith('.ttf'))
  .map((f) => new Uint8Array(readFileSync(join(ttfDir, f))));

const scaled = svg.replace(
  /<svg([^>]*)width="([\d.]+)"\s+height="([\d.]+)"/,
  (_, pre, w, h) => `<svg${pre}width="${Number(w) * scale}" height="${Number(h) * scale}"`,
);
try {
  const png = new Resvg(scaled, {
    font: { fontBuffers, loadSystemFonts: false },
  }).render().asPng();
  writeFileSync(output, png);
} catch (e) {
  fail(`PNG rasterization failed for ${input}: ${e.message}`);
}
