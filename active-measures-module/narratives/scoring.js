"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeNarrativeShare = computeNarrativeShare;
function computeNarrativeShare(claims, narrativeId) {
    const total = claims.length || 1;
    return claims.filter(c => c.narrativeIds?.includes(narrativeId)).length / total;
}
