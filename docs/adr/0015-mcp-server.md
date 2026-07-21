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
- **Transports: stdio first, then public streamable HTTP.**
  `mcp/stdio.mjs` (`@modelcontextprotocol/sdk`) imports the lib directly
  — zero infra, offline for local backends, parity by construction. The
  public server is a Cloudflare Worker (streamable HTTP, stateless JSON
  responses — no sessions, no SSE), gated on a spike proving the
  Excalidraw path (happy-dom global shims) runs under workerd and the
  bundles fit script-size limits (9.6 MB minified Excalidraw bundle vs
  3 MB gzip free / 10 MB paid). Spike failure pauses the public build;
  it does not affect stdio.

## Consequences

- Public endpoint inherits public-endpoint duties: source-size cap and
  basic rate limiting at launch; it also proxies kroki formats, so we
  forward, not amplify (one upstream call per request, no fan-out).
- Renderer bundles are rebuilt from the same sources; the CLI contract
  and committed-bundle CI check (ADR 0009) are unchanged.
- kroki-backed formats still need network; on the public server they
  work by definition, on stdio they keep the extension's failure mode.
