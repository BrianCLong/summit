"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAttested = requireAttested;
const node_fetch_1 = __importDefault(require("node-fetch"));
async function requireAttested(pool, classification) {
    if (!classification || classification === 'public')
        return true;
    if (!pool.tags?.includes('TEE'))
        return false;
    const r = await (0, node_fetch_1.default)(process.env.ATTEST_URL + '/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            nodeId: pool.id,
            provider: pool.tags.includes('SNP') ? 'SNP' : 'TDX',
            reportB64: pool.attestReport,
        }),
    });
    const j = await r.json();
    return !!j.ok;
}
