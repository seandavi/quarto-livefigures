// Shared SVG -> PNG rasterization via resvg-wasm with the bundled fonts.
// The napi binding's fontBuffers renders wrong glyphs (see ADR 0004); the
// wasm build is correct and required anyway (napi binaries can't bundle).
let wasmReady; // initWasm throws if called twice per process/isolate

export async function rasterize(svg, { assets, scale = 3 }) {
  const { initWasm, Resvg } = await import('@resvg/resvg-wasm');
  wasmReady ??= initWasm(await assets.resvgWasm());
  await wasmReady;
  const fontBuffers = await assets.ttfBuffers();
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
