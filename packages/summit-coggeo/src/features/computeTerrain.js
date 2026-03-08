"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeTerrain = computeTerrain;
function computeTerrain(narratives, tsBucket) {
    return narratives.map((narrative, index) => ({
        id: `terrain:${narrative.id}:${tsBucket}`,
        ts_bucket: tsBucket,
        h3: "global",
        narrative_id: narrative.id,
        pressure: index + 1,
        temperature: 0.5,
        wind_u: 0,
        wind_v: 0,
        turbulence: 0,
        storm_score: 0,
    }));
}
