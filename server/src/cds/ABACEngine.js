"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ABACEngine = void 0;
const CLASSIFICATION_LEVELS = {
    UNCLASSIFIED: 0,
    CONFIDENTIAL: 1,
    SECRET: 2,
    TOP_SECRET: 3,
};
class ABACEngine {
    /**
     * Evaluates if a user can access a specific resource label.
     */
    canAccess(user, resourceLabel) {
        // 1. Clearance Check
        if (CLASSIFICATION_LEVELS[user.clearance] < CLASSIFICATION_LEVELS[resourceLabel.classification]) {
            return false;
        }
        // 2. Compartment Check (User must have ALL compartments required by resource)
        if (resourceLabel.compartments && resourceLabel.compartments.length > 0) {
            const hasAllCompartments = resourceLabel.compartments.every((c) => user.accessCompartments.includes(c));
            if (!hasAllCompartments) {
                return false;
            }
        }
        // 3. Releasability Check (User nationality must be in releasability list if it exists)
        if (resourceLabel.releasability && resourceLabel.releasability.length > 0) {
            const userRelTag = `REL_TO_${user.nationality}`;
            const isReleasable = resourceLabel.releasability.some((r) => r === userRelTag || r === 'REL_TO_ALL');
            if (!isReleasable) {
                return false;
            }
        }
        return true;
    }
    /**
     * Evaluates if a transfer between two domains is allowed for a given resource.
     */
    canTransfer(user, resourceLabel, sourceDomainDetails, targetDomainDetails) {
        const sourceLevel = CLASSIFICATION_LEVELS[sourceDomainDetails.classification];
        const targetLevel = CLASSIFICATION_LEVELS[targetDomainDetails.classification];
        // High-to-Low (Downgrade)
        if (sourceLevel > targetLevel) {
            if (!this.canAccess(user, resourceLabel)) {
                return { allowed: false, reason: 'User lacks access to source material' };
            }
        }
        // Low-to-High (Ingest)
        if (sourceLevel < targetLevel) {
            if (!this.canAccess(user, resourceLabel)) {
                return { allowed: false, reason: 'User lacks access to source material' };
            }
        }
        // Lateral
        if (sourceLevel === targetLevel) {
            if (!this.canAccess(user, resourceLabel)) {
                return { allowed: false, reason: 'User lacks access to source material' };
            }
        }
        return { allowed: true };
    }
}
exports.ABACEngine = ABACEngine;
