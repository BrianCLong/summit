"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeRemoteProvenance = mergeRemoteProvenance;
const crypto_1 = require("crypto");
function computeMerkleRoot(leaves) {
    if (!leaves || leaves.length === 0)
        return '';
    let level = leaves.map((x) => Buffer.from(x));
    while (level.length > 1) {
        const next = [];
        for (let i = 0; i < level.length; i += 2) {
            const a = level[i];
            const b = level[i + 1] || level[i];
            next.push((0, crypto_1.createHash)('sha256')
                .update(Buffer.concat([a, b]))
                .digest());
        }
        level = next;
    }
    return 'sha256:' + level[0].toString('hex');
}
async function mergeRemoteProvenance(runId, remoteRoot, leaves) {
    const local = computeMerkleRoot(leaves);
    if (local !== remoteRoot)
        throw new Error('provenance mismatch');
    return { verified: true, root: local, runId };
}
