"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCosign = verifyCosign;
const node_child_process_1 = require("node:child_process");
async function verifyCosign(ref, opts) {
    const isDev = (process.env.NODE_ENV || 'development') !== 'production';
    if ((process.env.COSIGN_DISABLED || '').toLowerCase() === 'true' || isDev)
        return true;
    const key = opts?.key || process.env.COSIGN_PUBLIC_KEY;
    const args = ['verify'];
    if (key)
        args.push('-key', key);
    if (opts?.annotations) {
        for (const [k, v] of Object.entries(opts.annotations)) {
            args.push('-a', `${k}=${v}`);
        }
    }
    args.push(ref);
    try {
        await new Promise((res, rej) => (0, node_child_process_1.execFile)('cosign', args, (e) => (e ? rej(e) : res())));
        return true;
    }
    catch {
        return false;
    }
}
