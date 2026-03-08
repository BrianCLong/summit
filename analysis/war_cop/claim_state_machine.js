"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateClaimState = updateClaimState;
function updateClaimState(claim) {
    let newState = claim.state;
    if (claim.contradiction_count > 0) {
        newState = 'contested';
    }
    else if (claim.corroboration_count > 1) {
        newState = 'corroborated';
    }
    else if (claim.corroboration_count === 1) {
        newState = 'supported';
    }
    return { ...claim, state: newState };
}
