"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetrievalEngine = void 0;
const canonical_js_1 = require("./util/canonical.js");
const emitter_js_1 = require("./evidence/emitter.js");
class RetrievalEngine {
    async compile(intent, options = {}) {
        const plan = {
            query: { text: intent },
            topK: options.topK || 5,
            backend: options.backend || 'local_stub'
        };
        return plan;
    }
    async executeLocalStub(plan) {
        const planJson = (0, canonical_js_1.canonicalize)(plan);
        const planHash = (0, canonical_js_1.sha256)(planJson);
        // Deterministic stub results based on input hash
        const contexts = [
            {
                chunkId: `chunk_${planHash.substring(0, 8)}_1`,
                score: 0.95,
                uri: "doc:stub/1",
                textHash: (0, canonical_js_1.sha256)("stub content 1"),
                content: "This is stub content 1 for " + plan.query.text
            },
            {
                chunkId: `chunk_${planHash.substring(0, 8)}_2`,
                score: 0.88,
                uri: "doc:stub/2",
                textHash: (0, canonical_js_1.sha256)("stub content 2"),
                content: "This is stub content 2"
            }
        ];
        const result = {
            contexts,
            graph: { entities: 5, relations: 10, hops: 2 },
            evidenceBundleRef: `retrieval_${planHash}` // Placeholder ref
        };
        // Emit evidence side-effect
        // In a real system, we might fetch the actual policy object. Here we use a stub.
        const policyStub = { version: 1, gates: { execution: { allowed: true } } };
        await (0, emitter_js_1.emitEvidence)(plan, result, policyStub, []);
        return result;
    }
}
exports.RetrievalEngine = RetrievalEngine;
