"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeComplaintVelocity = computeComplaintVelocity;
function computeComplaintVelocity(volume, priorVolume) {
    if (priorVolume === 0)
        return volume;
    return (volume - priorVolume) / priorVolume;
}
