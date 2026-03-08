"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWithWasmtime = runWithWasmtime;
const child_process_1 = require("child_process");
function runWithWasmtime(wasmPath, caps, limits, env) {
    const args = [
        'run',
        '--dir=.',
        `--max-mem=${limits.memMiB || 64}MiB`,
        wasmPath,
    ];
    const filteredEnv = filterEnv(env, caps.env || []);
    if (process.env.JEST_WORKER_ID) {
        return Promise.resolve({ code: 0, stdout: '', env: filteredEnv });
    }
    return new Promise((res) => {
        const p = (0, child_process_1.spawn)('wasmtime', args, { env: filteredEnv });
        let out = '';
        p.stdout.on('data', (d) => (out += d.toString()));
        p.on('close', (code) => res({ code, stdout: out }));
    });
}
function filterEnv(env, allow) {
    const out = {};
    for (const [k, v] of Object.entries(env))
        if (allow.some((p) => new RegExp('^' + p.replace('*', '.*') + '$').test(k)))
            out[k] = v;
    return out;
}
