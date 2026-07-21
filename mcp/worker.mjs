// livefigures public MCP server — Cloudflare Worker, stateless streamable
// HTTP (ADR 0015): POST one JSON-RPC message to / or /mcp, get JSON back.
// Local backends render in-isolate from renderer/src/lib; graphviz and dbml
// fall back to kroki here because workerd bans runtime wasm compilation
// (their engines embed wasm bytes). Fonts/resvg.wasm come from the static
// assets binding (the extension dir).
import { createMcp } from './core.mjs';
import { makeTools, INSTRUCTIONS } from './tools.mjs';
import { renderExcalidrawSvg } from '../renderer/src/lib/excalidraw.mjs';
import { renderVegaSvg } from '../renderer/src/lib/vega.mjs';
import { renderTextDiagramSvg } from '../renderer/src/lib/text.mjs';
import { renderKrokiSvg } from '../renderer/src/lib/kroki.mjs';
import { rasterize } from '../renderer/src/lib/rasterize.mjs';
import { Buffer } from 'node:buffer';
import resvgWasm from '../_extensions/livefigures/resvg.wasm';
import SKILL from '../skills/livefigures/SKILL.md';
import EXT_YML from '../_extensions/livefigures/_extension.yml';

const VERSION = (/version:\s*"?([\d.]+)/.exec(EXT_YML) ?? [])[1] ?? '0.0.0';
const KROKI_FALLBACK = { graphviz: 'graphviz', dbml: 'dbml' };
const TEXT_KINDS = new Set(['nomnoml', 'wavedrom', 'bytefield']);

function workerAssets(env) {
  const get = async (p) => {
    const res = await env.ASSETS.fetch('https://assets.local' + p);
    return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
  };
  return {
    font: (name) => get('/fonts/' + name),
    async ttfBuffers() {
      const manifest = JSON.parse(new TextDecoder().decode(await get('/fonts/ttf/manifest.json')));
      return (await Promise.all(manifest.map((f) => get('/fonts/ttf/' + f)))).filter(Boolean);
    },
    resvgWasm: () => resvgWasm, // WebAssembly.Module via wrangler CompiledWasm
  };
}

function makeRender(env) {
  const assets = workerAssets(env);
  return async (f, source, { output, theme, background, scale }) => {
    const label = `source.${f.exts[0]}`;
    let svg;
    if (f.id === 'excalidraw') {
      svg = await renderExcalidrawSvg(source, { theme, background, assets, label });
    } else if (f.id === 'vega' || f.id === 'vega-lite') {
      svg = await renderVegaSvg(source, { kind: f.id, theme, background, label, csp: true });
    } else if (TEXT_KINDS.has(f.id)) {
      svg = await renderTextDiagramSvg(source, { kind: f.id, label });
    } else {
      const type = f.krokiType ?? KROKI_FALLBACK[f.id];
      if (!type) throw new Error(`format ${f.id} is not available on the public server`);
      svg = await renderKrokiSvg(source, { type, label });
    }
    if (output === 'svg') return { text: svg };
    return { base64: Buffer.from(await rasterize(svg, { assets, scale })).toString('base64') };
  };
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version',
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

const INFO = `livefigures public MCP server (streamable HTTP, stateless).

Connect an MCP client to this URL, e.g.:
  claude mcp add --transport http livefigures https://mcp.livefigures.seandavis.net/mcp

Tools: render (figure source -> PNG image / SVG text), validate, list_formats.
Docs: https://livefigures.seandavis.net  ·  https://github.com/seandavi/quarto-livefigures
`;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (url.pathname !== '/' && url.pathname !== '/mcp') {
      return new Response('not found\n', { status: 404, headers: CORS });
    }
    if (req.method === 'GET') {
      // stateless server: no SSE stream to offer (spec-sanctioned 405 for
      // event-stream requests); plain GET gets the info page
      return req.headers.get('accept')?.includes('text/event-stream')
        ? new Response(null, { status: 405, headers: CORS })
        : new Response(INFO, { headers: { 'Content-Type': 'text/plain', ...CORS } });
    }
    if (req.method !== 'POST') return new Response(null, { status: 405, headers: CORS });
    if (Number(req.headers.get('content-length')) > 3_000_000) {
      return new Response('payload too large\n', { status: 413, headers: CORS });
    }
    let msg;
    try {
      msg = await req.json();
    } catch {
      return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }, 400);
    }
    const handle = createMcp({
      name: 'livefigures',
      version: VERSION,
      instructions: INSTRUCTIONS,
      tools: makeTools(makeRender(env)),
      resources: [{
        uri: 'livefigures://skill',
        name: 'livefigures agent skill',
        description: 'Full authoring briefing: syntax, format choice, options, failure modes',
        mimeType: 'text/markdown',
        text: () => SKILL,
      }],
    });
    const res = await handle(msg);
    return res ? json(res) : new Response(null, { status: 202, headers: CORS });
  },
};
