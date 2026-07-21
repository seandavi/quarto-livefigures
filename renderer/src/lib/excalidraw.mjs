// Excalidraw scene -> SVG, headless. DOM shims (happy-dom, validated in the
// ADR 0001 spike) install once, process/isolate-wide. The fetch wrapper
// serves font assets for the livefigures.invalid host and delegates every
// other host to the original fetch, so kroki renders in the same process
// keep working; any non-font request excalidraw makes still hard-fails.
let shimsReady;
let shimAssets;
let fontError;

async function installShims(assets) {
  shimAssets = assets;
  if (shimsReady) return shimsReady;
  shimsReady = (async () => {
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

    // Serve font assets locally; excalidraw never touches the real network
    // (offline determinism — verified byte-identical in the spike).
    // excalidraw reads window.EXCALIDRAW_ASSET_PATH; set globalThis too for
    // any free-variable lookup.
    win.EXCALIDRAW_ASSET_PATH = 'https://livefigures.invalid/';
    globalThis.EXCALIDRAW_ASSET_PATH = 'https://livefigures.invalid/';
    const realFetch = globalThis.fetch?.bind(globalThis);
    globalThis.fetch = async (url, init) => {
      const u = String(url?.url ?? url);
      // font requests are intercepted on ANY host — excalidraw's CDN
      // fallback base must never reach the network (embedding + determinism)
      if (!u.includes('livefigures.invalid') && !/fonts\/[^?#]+\.woff2/.test(u)) return realFetch(url, init);
      const m = u.match(/fonts\/([^?#]+\.woff2)/);
      const bytes = m ? await shimAssets.font(m[1]) : null;
      if (!bytes) {
        // ponytail: CJK (Xiaolai) is not bundled (13 MB); documented limitation.
        fontError = new Error(m
          ? `font asset ${m[1]} is not bundled with quarto-livefigures (CJK text is not yet supported)`
          : `unexpected network request during render: ${u}`);
        throw fontError;
      }
      return new Response(bytes, { status: 200, headers: { 'Content-Type': 'font/woff2' } });
    };
  })();
  return shimsReady;
}

export async function renderExcalidrawSvg(source, { theme = 'light', background = 'transparent', assets, label = 'scene' }) {
  let scene;
  try {
    scene = JSON.parse(source);
  } catch (e) {
    throw new Error(`${label} is not valid Excalidraw JSON (${e.message})`);
  }
  if (scene.type !== 'excalidraw' || !Array.isArray(scene.elements)) {
    throw new Error(`${label} is not an Excalidraw scene (missing type/elements)`);
  }

  await installShims(assets);
  fontError = undefined;
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
    throw fontError ?? new Error(`Excalidraw export failed for ${label}: ${e.message}`);
  }
  if (fontError) throw fontError; // export may swallow the font rejection
  return svgEl.outerHTML;
}
