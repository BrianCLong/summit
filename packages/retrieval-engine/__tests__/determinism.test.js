"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const engine_js_1 = require("../src/engine.js");
const canonical_js_1 = require("../src/util/canonical.js");
const globals_1 = require("@jest/globals");
// Stubbing emitEvidence if needed, but integration test is fine too.
// For now we rely on the real implementation which writes to disk (safe in sandbox).
(0, globals_1.describe)('RetrievalEngine Determinism', () => {
    const engine = new engine_js_1.RetrievalEngine();
    (0, globals_1.it)('should produce identical plans for identical inputs', async () => {
        const intent = "verify determinism";
        const plan1 = await engine.compile(intent, { topK: 5 });
        const plan2 = await engine.compile(intent, { topK: 5 });
        (0, globals_1.expect)((0, canonical_js_1.canonicalize)(plan1)).toBe((0, canonical_js_1.canonicalize)(plan2));
    });
    (0, globals_1.it)('should produce identical results/evidence refs for identical plans', async () => {
        const intent = "verify determinism run";
        const plan = await engine.compile(intent);
        const result1 = await engine.executeLocalStub(plan);
        const result2 = await engine.executeLocalStub(plan);
        (0, globals_1.expect)(result1.evidenceBundleRef).toBe(result2.evidenceBundleRef);
        (0, globals_1.expect)((0, canonical_js_1.canonicalize)(result1)).toBe((0, canonical_js_1.canonicalize)(result2));
    });
});
