"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllowlistViolation = void 0;
exports.createTesqPolicyHook = createTesqPolicyHook;
class AllowlistViolation extends Error {
    constructor(message) {
        super(message);
        this.name = 'AllowlistViolation';
    }
}
exports.AllowlistViolation = AllowlistViolation;
function createTesqPolicyHook(manifest) {
    const index = new Map();
    for (const entry of manifest.entries) {
        index.set(`${entry.tool.toLowerCase()}@${entry.version}`, entry.riskScore);
    }
    return function enforce(request) {
        if (request.environment !== manifest.environment) {
            throw new AllowlistViolation(`Manifest environment mismatch: expected ${manifest.environment}, received ${request.environment}`);
        }
        const key = `${request.tool.toLowerCase()}@${request.version}`;
        if (!index.has(key)) {
            throw new AllowlistViolation(`Tool ${request.tool}@${request.version} is not present in the allowlist`);
        }
        return {
            tool: request.tool,
            version: request.version,
            riskScore: index.get(key) ?? 0,
        };
    };
}
