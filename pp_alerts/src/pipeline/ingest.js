"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingest = ingest;
const no_plaintext_sensitive_1 = require("../policy/no_plaintext_sensitive");
function ingest(payload) {
    // 1. Governance check
    (0, no_plaintext_sensitive_1.validate)(payload.topology);
    // shares are technically just bytes, but we check structure
    (0, no_plaintext_sensitive_1.validate)(payload.shares);
    // 2. Schema validation (mocked for now, real system uses schema validator)
    if (!payload.topology.nodes || !payload.topology.edges) {
        throw new Error("Invalid topology");
    }
    if (!payload.shares.shares) {
        throw new Error("Invalid shares");
    }
    // 3. Ingest logic (mocked)
    // console.log("Ingesting privacy-preserving graph...");
    return true;
}
