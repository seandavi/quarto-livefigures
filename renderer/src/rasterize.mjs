// Shared SVG -> PNG rasterization via resvg-wasm with the bundled fonts.
// The napi binding's fontBuffers renders wrong glyphs (see ADR 0004); the
// wasm build is correct and required anyway (napi binaries can't bundle).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export async function rasterize(svg, { extDir, scale = 3 }) {
  const { initWasm, Resvg } = await import('@resvg/resvg-wasm');
  await initWasm(readFileSync(join(extDir, 'resvg.wasm')));
  const ttfDir = join(extDir, 'fonts', 'ttf');
  const fontBuffers = readdirSync(ttfDir)
    .filter((f) => f.endsWith('.ttf'))
    .map((f) => new Uint8Array(readFileSync(join(ttfDir, f))));
  const scaled = svg.replace(
    /<svg([^>]*?)width="([\d.]+)"\s+height="([\d.]+)"/,
    (_, pre, w, h) => `<svg${pre}width="${Number(w) * scale}" height="${Number(h) * scale}"`,
  );
  return new Resvg(scaled, {
    font: {
      fontBuffers,
      loadSystemFonts: false,
      defaultFontFamily: 'Liberation Sans',
      sansSerifFamily: 'Liberation Sans',
      monospaceFamily: 'Cascadia Code',
    },
  }).render().asPng();
}
