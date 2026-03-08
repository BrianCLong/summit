"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSignals = extractSignals;
function extractSignals(observation) {
    return [
        {
            kind: "narrative",
            id: `nar-candidate:${observation.id}`,
            obs_id: observation.id,
            payload: { label: observation.content.slice(0, 120) },
        },
    ];
}
