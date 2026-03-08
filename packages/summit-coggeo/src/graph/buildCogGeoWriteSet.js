"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCogGeoWriteSet = buildCogGeoWriteSet;
function buildCogGeoWriteSet(writes, evidenceRefs) {
    return {
        id: `coggeo-writeset:${Date.now()}`,
        created_at: new Date().toISOString(),
        producer: "summit-coggeo",
        writes,
        evidence_refs: evidenceRefs,
    };
}
