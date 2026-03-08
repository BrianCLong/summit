"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signClaimSet = signClaimSet;
exports.verifyMerkle = verifyMerkle;
const crypto_1 = __importDefault(require("crypto"));
const node_fetch_1 = __importDefault(require("node-fetch"));
async function signClaimSet(transitKey, payload) {
    const bytes = Buffer.from(JSON.stringify(payload));
    const digest = crypto_1.default.createHash('sha256').update(bytes).digest('base64');
    const r = await (0, node_fetch_1.default)(`${process.env.VAULT_ADDR}/v1/transit/sign/${transitKey}`, {
        method: 'POST',
        headers: {
            'X-Vault-Token': String(process.env.VAULT_TOKEN || ''),
            'content-type': 'application/json',
        },
        body: JSON.stringify({ input: digest }),
    });
    if (!r.ok)
        throw new Error(`transit sign failed ${r.status}`);
    const j = await r.json();
    return { signature: j.data?.signature, sha256: digest };
}
function verifyMerkle(root, leaves) {
    // TODO: reuse MerkleLog to recompute root; placeholder returns true
    return !!root && Array.isArray(leaves);
}
