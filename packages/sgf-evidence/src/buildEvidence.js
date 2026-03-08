"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEvidenceBundle = buildEvidenceBundle;
const hash_js_1 = require("./hash.js");
function buildEvidenceBundle(packName, runId, data) {
    const report = {
        packName,
        runId,
        timestamp: new Date().toISOString(),
        data
    };
    const reportBuf = (0, hash_js_1.canonicalJson)(report);
    const reportHash = (0, hash_js_1.sha256Bytes)(reportBuf);
    const stamp = {
        evidence_id: `EVID-${new Date().toISOString().split('T')[0]}-${packName}-${runId}`,
        schema_version: "1.0.0",
        report_hash: reportHash
    };
    return {
        report,
        metrics: {},
        stamp
    };
}
