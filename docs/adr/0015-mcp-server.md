# ADR 0015: MCP server — render/validate tools, two layers, public on Workers

Date: 2026-07-21
Status: Accepted

## Context

Agents author livefigures sources blind: they write a `.dot` or an
Excalidraw scene and only see the result if a local `quarto render` runs
(needs Quarto + Node + the extension). An MCP tool that returns the
rendered figure as an image content block closes that loop — a
vision-capable agent previews what it wrote and iterates. kroki.io is
already a public render endpoint for most of our formats, but has no MCP
packaging, no livefigures option semantics, and no font/version parity
with our Excalidraw/Vega renderers. Parity is the differentiator: what
the tool previews is what `quarto render` produces.

Two layers were requested: (1) editing figure sources independently of
Quarto, (2) working with figures inside a Quarto document.

## Decision

- **Layer 1 — three tools, no more.** `render(format, source, options)`
  → SVG text or PNG image block; `validate(format, source)` → ok/error
  (render-and-discard, reusing our hard-fail messages, ADR 0006);
  `list_formats()` → the SKILL.md format table as data. No figure-editing
  tools: sources are text and the client agent already edits text.
- **Layer 2 — instructions, not tools.** The server `instructions` field
  carries a condensed SKILL.md (two syntax forms, `pre-ast` config, the
  `{.format}` gotcha); full SKILL.md is served as an MCP resource. No
  Quarto file-manipulation tools — inserting a figure block is a text
  edit the agent performs itself.
- **Common layer = a function boundary, not a package.** `renderer/src`
  splits into `lib/` (pure `(source, options, assets) → bytes`, throwing
  errors) and the existing thin CLI wrappers the Lua filter shells to.
  The `assets` parameter abstracts fonts/wasm so the same lib runs on
  Node (fs) and Workers (static assets). No published shared package —
  two consumers, one repo, zero version skew.
- **Transports: stdio first, then public streamable HTTP.** The stdio
  server ships *inside the extension* (`mcp.mjs`, bundled with a
  hand-rolled zero-dep protocol core instead of the MCP SDK) and renders
  by shelling to the sibling renderer bundles — anyone who ran
  `quarto add` already has it; parity is byte-for-byte. The public
  server is a Cloudflare Worker (streamable HTTP, stateless JSON
  responses — no sessions, no SSE) at `mcp.livefigures.seandavis.net`,
  rendering in-isolate from the lib.
- **Spike outcomes (what workerd required).** (1) happy-dom's window
  contextification hits `node:vm`; a stub suffices because its only vm
  use on our path is `createContext` plus a static
  `this.X = globalThis.X` script — emulated with a regex, no codegen
  (`mcp/vm-stub.mjs`). (2) vega's compiled expressions trip the dynamic
  codegen ban; the lib gained a `csp` option using `vega-interpreter`
  (vega's own CSP-safe evaluator). (3) graphviz and dbml embed wasm
  bytes and instantiate at runtime — banned on workerd with no
  precompiled-module hook, so the public server renders both via kroki
  (version-skew caveat vs. our bundled wasm; local/stdio unaffected).
  (4) resvg works via a CompiledWasm module import. (5) Deployed size is
  ~4.2 MB gzipped — needs the paid Workers tier, which this account has.

## Consequences

- Public endpoint inherits public-endpoint duties: source-size cap and
  basic rate limiting at launch; it also proxies kroki formats, so we
  forward, not amplify (one upstream call per request, no fan-out).
- Renderer bundles are rebuilt from the same sources; the CLI contract
  and committed-bundle CI check (ADR 0009) are unchanged.
- kroki-backed formats still need network; on the public server they
  work by definition, on stdio they keep the extension's failure mode.
- The excalidraw lib now sets `EXCALIDRAW_ASSET_PATH` on the happy-dom
  window (excalidraw reads it there); before, font embedding held only
  because the fetch shim happened to intercept the CDN-fallback URL.
