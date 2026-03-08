"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.laneFor = laneFor;
function laneFor(pr) {
    if (pr.labels.includes('hotfix') || pr.risk === 'high')
        return 'gold';
    if (pr.confidence >= 85 && pr.risk === 'low')
        return 'silver';
    return 'bronze';
}
