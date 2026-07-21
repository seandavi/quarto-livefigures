// Graphviz .dot/.gv -> SVG via @hpcc-js/wasm-graphviz (wasm embedded in
// the bundle; fully offline).
let gvReady;

export async function renderGraphvizSvg(source, { label = 'dot source' } = {}) {
  try {
    const { Graphviz } = await import('@hpcc-js/wasm-graphviz');
    gvReady ??= Graphviz.load();
    return (await gvReady).dot(source);
  } catch (e) {
    throw new Error(`graphviz rendering failed for ${label}: ${e.message}`);
  }
}
