"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSnapshot = buildSnapshot;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
async function buildSnapshot({ runbookPath, plugins = [], contracts = [], }) {
    // Minimal: concatenate bytes deterministically and hash; in prod, tarball + Vault Transit sign.
    const parts = [runbookPath, ...plugins, ...contracts];
    const chunks = [];
    for (const p of parts) {
        try {
            chunks.push(await fs_1.promises.readFile(p));
        }
        catch {
            /* ignore missing */
        }
    }
    const bytes = Buffer.concat(chunks);
    const digest = 'sha256:' + (0, crypto_1.createHash)('sha256').update(bytes).digest('hex');
    const signature = 'unsigned';
    const outFile = `/tmp/rb_${Date.now()}.bin`;
    await fs_1.promises.writeFile(outFile, bytes);
    return { file: outFile, digest, signature };
}
