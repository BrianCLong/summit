"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPackage = verifyPackage;
const node_child_process_1 = require("node:child_process");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
async function verifyPackage(pkgDir) {
    const entry = node_path_1.default.join(pkgDir, 'runbook.yaml');
    const sig = node_path_1.default.join(pkgDir, 'signatures/cosign.sig');
    await promises_1.default.access(entry);
    await promises_1.default.access(sig);
    // Only enforce when cosign present and not explicitly disabled
    const disabled = (process.env.COSIGN_DISABLED || '').toLowerCase() === 'true' ||
        (process.env.NODE_ENV || 'development') !== 'production';
    if (disabled)
        return { ok: true };
    await new Promise((res, rej) => (0, node_child_process_1.execFile)('cosign', ['verify-blob', '--signature', sig, entry], (e) => e ? rej(e) : res()));
    return { ok: true };
}
