"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateManifest = generateManifest;
const crypto_1 = require("crypto");
const compiler_js_1 = require("../policy/compiler.js");
const store_js_1 = require("../policy/store.js");
const api_1 = require("@opentelemetry/api");
async function generateManifest(targetId, purpose, inputs) {
    const tracer = api_1.trace.getTracer('provenance');
    return tracer.startActiveSpan('export.manifest.write', async (span) => {
        // 1. Get Policies & Compile
        const policies = store_js_1.policyStore.getActivePoliciesForTarget(targetId);
        const compiler = compiler_js_1.PolicyCompiler.getInstance();
        const ir = compiler.compile(policies);
        // 2. Construct Manifest
        const manifest = {
            version: '1.0.0',
            generatedAt: new Date().toISOString(),
            targetId,
            purpose,
            inputs: inputs.map(i => ({ id: i.id, hash: hashContent(i) })),
            policy: {
                irHash: ir.hash,
                activePolicies: ir.activePolicies,
                clausesUsed: ir.clausesUsed,
                compilerVersion: ir.version
            },
            manifestHash: ''
        };
        // 3. Compute Merkle Root / Manifest Hash
        const contentToHash = { ...manifest, manifestHash: undefined };
        manifest.manifestHash = hashContent(contentToHash);
        span.setAttribute('manifest.hash', manifest.manifestHash);
        span.end();
        return manifest;
    });
}
function hashContent(content) {
    return (0, crypto_1.createHash)('sha256').update(JSON.stringify(content)).digest('hex');
}
