// Vega/Vega-Lite spec -> SVG. Pure Node, no DOM needed — vega renders
// headless with renderer:'none' (text measurement falls back to built-in
// metrics; 'canvas' stays external in the bundle).
// csp: parse to AST and evaluate with vega-interpreter instead of generated
// Function()s — required where dynamic code generation is banned (workerd).
export async function renderVegaSvg(source, { kind, theme = 'light', background = 'transparent', label = 'spec', csp = false }) {
  let spec;
  try {
    spec = JSON.parse(source);
  } catch (e) {
    throw new Error(`${label} is not valid JSON (${e.message})`);
  }

  const vega = await import('vega');
  const isVegaLite = kind === 'vega-lite' || /vega-lite/.test(spec.$schema ?? '');

  const config = {};
  if (theme === 'dark') {
    const themes = await import('vega-themes');
    Object.assign(config, themes.dark);
  }
  if (background === 'transparent') {
    config.background = 'transparent';
  }

  let vgSpec = spec;
  if (isVegaLite) {
    const { compile } = await import('vega-lite');
    try {
      vgSpec = compile(spec, { config }).spec;
    } catch (e) {
      throw new Error(`vega-lite compilation failed for ${label}: ${e.message}`);
    }
  }

  try {
    const runtime = vega.parse(vgSpec, isVegaLite ? undefined : config, csp ? { ast: true } : undefined);
    const viewOpts = { renderer: 'none' };
    if (csp) viewOpts.expr = (await import('vega-interpreter')).expressionInterpreter;
    return await new vega.View(runtime, viewOpts).toSVG();
  } catch (e) {
    throw new Error(`vega rendering failed for ${label}: ${e.message}`);
  }
}
