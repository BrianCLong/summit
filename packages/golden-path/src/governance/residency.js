"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceResidency = enforceResidency;
function enforceResidency(tag, allowedRegions, auditTrail) {
    if (!allowedRegions.includes(tag.residencyRegion)) {
        auditTrail.push({
            timestamp: new Date().toISOString(),
            message: 'Residency violation detected',
            context: { residencyRegion: tag.residencyRegion, allowedRegions },
        });
        throw new Error(`Residency ${tag.residencyRegion} is not permitted`);
    }
}
