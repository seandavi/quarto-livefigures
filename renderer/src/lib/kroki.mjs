// Formats with no JS renderer (PlantUML first) via a kroki HTTP endpoint
// (ADR 0012). Network-dependent by nature; endpoint configurable for
// self-hosting.
export async function renderKrokiSvg(source, { type, endpoint = 'https://kroki.io', label = 'source' }) {
  endpoint = endpoint.replace(/\/$/, '');
  let res;
  try {
    res = await fetch(endpoint + '/', {
      method: 'POST',
      // explicit UA: kroki.io's Cloudflare 403s some default client UAs
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'quarto-livefigures' },
      body: JSON.stringify({ diagram_source: source, diagram_type: type, output_format: 'svg' }),
    });
  } catch (e) {
    throw new Error(`could not reach kroki endpoint ${endpoint} for ${label} (${e.cause?.code ?? e.message}). ` +
      `This backend requires network access, or set a self-hosted endpoint via ` +
      `'livefigures: kroki-url: <url>' in your metadata.`);
  }
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`kroki (${endpoint}) rejected ${label}: HTTP ${res.status} — ${body.slice(0, 300)}`);
  }
  if (!body.includes('<svg')) {
    // some broken kroki backends return HTTP 200 with an empty/non-SVG body
    throw new Error(`kroki (${endpoint}) returned no usable SVG for ${label} (HTTP 200, ` +
      `${body.length} bytes). The '${type}' renderer may be broken on this server.`);
  }
  return body;
}
