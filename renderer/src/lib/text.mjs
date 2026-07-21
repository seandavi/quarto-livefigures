// Text-diagram backends: nomnoml, WaveDrom, bytefield -> SVG.
// All pure JS, headless. Selected for agent fluency (ADR 0011).
export async function renderTextDiagramSvg(source, { kind, label = 'source' }) {
  try {
    if (kind === 'nomnoml') {
      const nomnoml = await import('nomnoml');
      return nomnoml.renderSvg(source);
    }
    if (kind === 'wavedrom') {
      const wavedrom = await import('wavedrom');
      const onml = await import('onml');
      return onml.stringify(wavedrom.renderAny(0, JSON.parse(source), wavedrom.waveSkin));
    }
    if (kind === 'bytefield') {
      const bytefield = (await import('bytefield-svg')).default;
      return bytefield(source);
    }
  } catch (e) {
    throw new Error(`rendering failed for ${label}: ${e.message}`);
  }
  throw new Error(`unrecognized text-diagram kind: ${kind}`);
}
