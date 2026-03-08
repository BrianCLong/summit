"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvidenceBundle = createEvidenceBundle;
const node_crypto_1 = require("node:crypto");
function stableStringify(value) {
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, val]) => `"${key}":${stableStringify(val)}`);
        return `{${entries.join(',')}}`;
    }
    return JSON.stringify(value);
}
function createEvidenceBundle(params) {
    const planPayload = stableStringify(params.plan);
    const planHash = (0, node_crypto_1.createHash)('sha256').update(planPayload).digest('hex');
    return {
        planHash,
        rendererVersion: params.rendererVersion,
        promptId: params.promptId,
        toolInputs: params.toolInputs,
        toolOutputs: params.toolOutputs,
        generatedAt: new Date().toISOString(),
    };
}
