"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEvidenceIndex = buildEvidenceIndex;
function buildEvidenceIndex(entries, version = "1.0.0") {
    const items = entries
        .map((entry) => ({
        evidence_id: entry.report.evidence_id,
        path: `${entry.report.evidence_id}`,
    }))
        .sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));
    return { version, items };
}
