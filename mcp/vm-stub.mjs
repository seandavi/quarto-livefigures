// 'vm' stub for happy-dom on workerd (ADR 0015 spike). happy-dom's only vm
// use on the SVG-export path is setupVMContext: createContext(window) plus a
// static Script of pure `this.X = globalThis.X;` assignments
// (VMGlobalPropertyScript). Emulate that without code execution — workerd
// bans dynamic codegen; anything else throws loudly.
export function createContext(o) { return o; }
export function isContext() { return false; }
export class Script {
  constructor(code) { this.code = String(code); }
  runInContext(ctx) {
    const assigns = [...this.code.matchAll(/this\.(\w+)\s*=\s*globalThis\.(\w+);/g)];
    if (!assigns.length) throw new Error('vm Script execution disabled on workerd');
    for (const [, a, b] of assigns) ctx[a] = globalThis[b];
  }
  runInNewContext(ctx = {}) { return this.runInContext(ctx); }
}
export function runInContext() { throw new Error('vm.runInContext disabled on workerd'); }
export default { createContext, isContext, Script, runInContext };
