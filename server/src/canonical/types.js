"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterByTemporal = filterByTemporal;
exports.isValidAt = isValidAt;
exports.wasKnownAt = wasKnownAt;
function filterByTemporal(entities, pointInTime) {
    const pit = new Date(pointInTime).getTime();
    return entities.filter(e => {
        const from = e.validFrom ? new Date(e.validFrom).getTime() : 0;
        const to = e.validTo ? new Date(e.validTo).getTime() : Infinity;
        return pit >= from && pit <= to;
    });
}
// Check if entity was valid at a specific point in time
function isValidAt(entity, pointInTime) {
    const pit = pointInTime.getTime();
    const from = entity.validFrom.getTime();
    const to = entity.validTo ? entity.validTo.getTime() : Infinity;
    return pit >= from && pit <= to;
}
// Check if entity was known/recorded at a specific point in time
function wasKnownAt(entity, pointInTime) {
    return pointInTime.getTime() >= entity.recordedAt.getTime();
}
