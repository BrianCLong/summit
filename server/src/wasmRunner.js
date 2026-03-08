"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWasmStep = runWasmStep;
const fs_1 = require("fs");
const wasi_1 = require("wasi");
async function runWasmStep(wasmPath, input, caps = {}) {
    // Enforce simple capability gates by not wiring imports for FS/NET (default off)
    const wasi = new wasi_1.WASI({
        version: 'preview1',
        args: [],
        env: {},
        preopens: caps.fs ? { '/': '/' } : {},
    });
    const bin = await fs_1.promises.readFile(wasmPath);
    const mod = await WebAssembly.compile(bin);
    const inst = await WebAssembly.instantiate(mod, {
        // @ts-ignore WASI types are experimental/incomplete in Node typings
        wasi_snapshot_preview1: wasi.wasiImport,
    });
    const deadline = Date.now() + (caps.cpuMs || Number(process.env.WASM_MAX_CPU_MS || 5000));
    const memLimit = (caps.memMb || Number(process.env.WASM_MAX_MEM_MB || 256)) * 1024 * 1024;
    const guard = setInterval(() => {
        const m = inst.exports?.memory;
        if (m && m.buffer.byteLength > memLimit)
            throw new Error('wasm OOM');
        if (Date.now() > deadline)
            throw new Error('wasm timeout');
    }, 50);
    try {
        // @ts-ignore WASI start expects specific instance type
        wasi.start(inst);
        // Convention: export_json(ptr) returns a pointer to a NUL-terminated JSON string
        const exportJson = inst.exports?.['export_json'];
        if (typeof exportJson !== 'function')
            throw new Error('missing export_json()');
        // Pass input via memory: simple approach, let plugin read from stdin or global if needed.
        const resPtr = exportJson(JSON.stringify(input));
        // @ts-ignore Memory access needs cast
        const mem = new Uint8Array(inst.exports.memory.buffer);
        const out = decodeCString(mem, resPtr);
        return JSON.parse(out);
    }
    finally {
        clearInterval(guard);
    }
}
function decodeCString(mem, ptr) {
    let end = ptr;
    while (mem[end] !== 0)
        end++;
    return new TextDecoder().decode(mem.slice(ptr, end));
}
