// Build the committed renderer bundle + font assets into _extensions/livefigures/.
// Run: npm run build (from renderer/). CI verifies the output matches (ADR 0009).
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import wawoff2 from 'wawoff2';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, '..', '_extensions', 'livefigures');
const EXCALIDRAW_DIST = join(HERE, 'node_modules', '@excalidraw', 'excalidraw', 'dist', 'prod');

const common = { bundle: true, platform: 'node', format: 'esm', minify: true, logLevel: 'error' };
await build({ ...common, entryPoints: [join(HERE, 'src', 'render.mjs')], outfile: join(EXT, 'renderer.mjs') });
await build({
  ...common,
  entryPoints: [join(HERE, 'src', 'render-vega.mjs')],
  outfile: join(EXT, 'renderer-vega.mjs'),
  external: ['canvas'], // vega's optional native dep; headless metrics suffice
});
await build({
  ...common,
  entryPoints: [join(HERE, 'src', 'render-text.mjs')],
  outfile: join(EXT, 'renderer-text.mjs'),
  external: ['canvas'],
});
await build({
  ...common,
  entryPoints: [join(HERE, 'src', 'render-kroki.mjs')],
  outfile: join(EXT, 'renderer-kroki.mjs'),
});
await build({
  ...common,
  entryPoints: [join(HERE, 'src', 'render-graphviz.mjs')],
  outfile: join(EXT, 'renderer-graphviz.mjs'),
});
await build({
  ...common,
  entryPoints: [join(HERE, 'src', 'render-dbml.mjs')],
  outfile: join(EXT, 'renderer-dbml.mjs'),
  banner: {
    // dbml-renderer's CJS internals expect __dirname at runtime
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url); " +
      "import { fileURLToPath as __fu } from 'node:url'; import { dirname as __dn } from 'node:path'; " +
      "const __filename = __fu(import.meta.url); const __dirname = __dn(__filename);",
  },
});

// MCP stdio server (ADR 0015): ships in the extension dir, shells to the
// sibling renderer bundles. Zero deps, so this is just concatenation.
await build({ ...common, entryPoints: [join(HERE, '..', 'mcp', 'stdio.mjs')], outfile: join(EXT, 'mcp.mjs') });
cpSync(join(HERE, '..', 'skills', 'livefigures', 'SKILL.md'), join(EXT, 'SKILL.md'));

cpSync(join(HERE, 'node_modules', '@resvg', 'resvg-wasm', 'index_bg.wasm'), join(EXT, 'resvg.wasm'));

// Fonts: copy woff2 per family (for SVG embedding), convert to TTF (for resvg).
// ponytail: Xiaolai (CJK) is 13 MB of range-chunks — skipped; renderer hard-fails
// with a clear message if a scene needs it. Bundle it if users ask.
const SKIP = new Set(['Xiaolai']);
const fontsOut = join(EXT, 'fonts');
rmSync(fontsOut, { recursive: true, force: true });
mkdirSync(join(fontsOut, 'ttf'), { recursive: true });

for (const family of readdirSync(join(EXCALIDRAW_DIST, 'fonts'))) {
  if (SKIP.has(family)) continue;
  const src = join(EXCALIDRAW_DIST, 'fonts', family);
  cpSync(src, join(fontsOut, family), { recursive: true });
  for (const file of readdirSync(src).filter((f) => f.endsWith('.woff2'))) {
    const ttf = await wawoff2.decompress(readFileSync(join(src, file)));
    writeFileSync(join(fontsOut, 'ttf', `${family}-${file.replace(/\.woff2$/, '')}.ttf`), Buffer.from(ttf));
  }
}
// ttf manifest: the MCP worker has no readdir over static assets (ADR 0015)
writeFileSync(join(fontsOut, 'ttf', 'manifest.json'),
  JSON.stringify(readdirSync(join(fontsOut, 'ttf')).filter((f) => f.endsWith('.ttf'))));
console.log('built', EXT);
