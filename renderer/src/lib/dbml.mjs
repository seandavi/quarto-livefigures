// DBML -> SVG via @softwaretechnik/dbml-renderer (bundles viz.js; offline).
export async function renderDbmlSvg(source, { label = 'dbml source' } = {}) {
  try {
    const { run } = await import('@softwaretechnik/dbml-renderer');
    return run(source, 'svg');
  } catch (e) {
    throw new Error(`dbml rendering failed for ${label}: ${e.message}`);
  }
}
