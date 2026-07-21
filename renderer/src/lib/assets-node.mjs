// Node implementation of the assets seam: fonts/ and resvg.wasm live as
// siblings of the bundle (ADR 0001). Workers implement the same three
// methods over static assets instead of fs (ADR 0015).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function nodeAssets(extDir) {
  return {
    font(name) {
      const file = join(extDir, 'fonts', name);
      return existsSync(file) ? readFileSync(file) : null;
    },
    ttfBuffers() {
      const dir = join(extDir, 'fonts', 'ttf');
      return readdirSync(dir)
        .filter((f) => f.endsWith('.ttf'))
        .map((f) => new Uint8Array(readFileSync(join(dir, f))));
    },
    resvgWasm() {
      return readFileSync(join(extDir, 'resvg.wasm'));
    },
  };
}
