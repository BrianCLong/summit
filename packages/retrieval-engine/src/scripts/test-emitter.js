"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emitter_js_1 = require("../evidence/emitter.js");
const mockPlan = {
    query: { text: "test query" },
    topK: 5,
    backend: "local_stub"
};
const mockResult = {
    contexts: [],
    graph: { entities: 0, relations: 0, hops: 0 },
    evidenceBundleRef: "ref-123"
};
const mockPolicy = { version: 1, gates: {} };
async function run() {
    try {
        const dir = await (0, emitter_js_1.emitEvidence)(mockPlan, mockResult, mockPolicy, []);
        console.log(`Evidence emitted to: ${dir}`);
        process.exit(0);
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
