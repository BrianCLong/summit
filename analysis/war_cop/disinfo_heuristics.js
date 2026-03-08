"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDisinfoRisk = checkDisinfoRisk;
function checkDisinfoRisk(body, isOfficial, mediaHash) {
    const flags = [];
    let risk_level = 'low';
    if (!isOfficial && body.includes('breaking')) {
        flags.push('unofficial_breaking');
        risk_level = 'medium';
    }
    // Basic mock check for recycled media.
    if (mediaHash === 'RECYCLED_HASH_123') {
        flags.push('recycled_media');
        risk_level = 'high';
    }
    return { risk_level, flags };
}
