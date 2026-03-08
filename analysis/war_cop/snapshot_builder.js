"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSnapshot = buildSnapshot;
function buildSnapshot(stampId, utc, sources, claims) {
    return {
        snapshot_id: stampId,
        as_of_utc: utc,
        source_count: sources,
        claim_count: claims,
        deterministic_build: true,
    };
}
