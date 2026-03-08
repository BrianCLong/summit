"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectGravityWells = detectGravityWells;
function detectGravityWells(narratives) {
    if (!narratives.length)
        return [];
    return [
        {
            id: "well:seed",
            label: "Emergent Convergence Basin",
            strength: 0.42,
            evidence_refs: narratives.slice(0, 3).map((item) => item.id),
        },
    ];
}
