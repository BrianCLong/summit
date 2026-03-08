"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bestReviewer = bestReviewer;
function bestReviewer(chunk, devs) {
    return devs
        .filter((d) => d.areas.includes(chunk.area))
        .sort((a, b) => a.p95ReviewHrs - b.p95ReviewHrs || a.defectRate - b.defectRate)[0]?.user;
}
