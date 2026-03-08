"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWasm = runWasm;
const wasi_1 = require("wasi");
const promises_1 = __importDefault(require("fs/promises"));
const crypto_1 = require("crypto");
async function runWasm({ wasmPath, args, env, caps, limits }) {
    // 1) Build a minimal WASI environment; strip env except allowlist
    const allowedEnv = Object.fromEntries(Object.entries(env || {}).filter(([k]) => (caps.env || []).some(p => new RegExp("^" + p.replace("*", ".*") + "$").test(k))));
    const wasi = new wasi_1.WASI({ env: allowedEnv, args: ["plugin", ...(args || [])], preopens: caps.fs ? { "/sandbox": "/tmp" } : {} });
    // 2) Load WASM (no network APIs exposed unless you proxy them; we keep off by default)
    // Node's own import of wasm must use --experimental-wasi-unstable-preview1 or use wasmtime cli.
    const mod = await WebAssembly.compile(await promises_1.default.readFile(wasmPath));
    const instance = await WebAssembly.instantiate(mod, { wasi_snapshot_preview1: wasi.wasiImport, // WASI syscalls
        host: {
            // guarded host functions — expose only if caps allow
            randomBytes: (ptr, len) => {
                if (!caps.crypto)
                    return 0;
                const buf = (0, crypto_1.randomBytes)(len); // copy to memory by exported API (omitted for brevity)
                return 1;
            }
        }
    });
    // 3) Resource guards
    const timeout = setTimeout(() => { try {
        instance.exports?._stop?.();
        null;
    }
    catch { } ; }, limits.timeoutMs || limits.cpuMs || 5000);
    try {
        // 4) Run
        wasi.start(instance);
        return { ok: true, stdout: "", artifacts: [] };
    }
    finally {
        clearTimeout(timeout);
    }
}
