"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectStorms = detectStorms;
function detectStorms(cells) {
    return cells
        .filter((cell) => (cell.storm_score ?? 0) > 0.75)
        .map((cell) => ({
        id: `storm:${cell.id}`,
        narrative_id: cell.narrative_id,
        severity: cell.storm_score ?? 0,
        evidence_refs: [cell.id],
    }));
}
