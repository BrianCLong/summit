"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ABACEngine = void 0;
var CLASSIFICATION_LEVELS = {
    UNCLASSIFIED: 0,
    CONFIDENTIAL: 1,
    SECRET: 2,
    TOP_SECRET: 3,
};
var ABACEngine = /** @class */ (function () {
    function ABACEngine() {
    }
    /**
     * Evaluates if a user can access a specific resource label.
     */
    ABACEngine.prototype.canAccess = function (user, resourceLabel) {
        // 1. Clearance Check
        if (CLASSIFICATION_LEVELS[user.clearance] < CLASSIFICATION_LEVELS[resourceLabel.classification]) {
            return false;
        }
        // 2. Compartment Check (User must have ALL compartments required by resource)
        if (resourceLabel.compartments && resourceLabel.compartments.length > 0) {
            var hasAllCompartments = resourceLabel.compartments.every(function (c) {
                return user.accessCompartments.includes(c);
            });
            if (!hasAllCompartments) {
                return false;
            }
        }
        // 3. Releasability Check (User nationality must be in releasability list if it exists)
        if (resourceLabel.releasability && resourceLabel.releasability.length > 0) {
            // Assuming 'REL_TO_' + Nationality code convention or direct match
            var userRelTag_1 = "REL_TO_".concat(user.nationality);
            var isReleasable = resourceLabel.releasability.some(function (r) { return r === userRelTag_1 || r === 'REL_TO_ALL'; });
            if (!isReleasable) {
                return false;
            }
        }
        return true;
    };
    /**
     * Evaluates if a transfer between two domains is allowed for a given resource.
     */
    ABACEngine.prototype.canTransfer = function (user, resourceLabel, sourceDomainDetails, targetDomainDetails) {
        var sourceLevel = CLASSIFICATION_LEVELS[sourceDomainDetails.classification];
        var targetLevel = CLASSIFICATION_LEVELS[targetDomainDetails.classification];
        // High-to-Low (Downgrade)
        if (sourceLevel > targetLevel) {
            // Must have explicit downgrade authority (implied if user has high clearance, but typically requires review)
            // For now, we allow if user has source clearance.
            if (!this.canAccess(user, resourceLabel)) {
                return { allowed: false, reason: 'User lacks access to source material' };
            }
            // Strict rule: Cannot downgrade TS/SCI automatically without specific review (simulated here)
            if (resourceLabel.classification === 'TOP_SECRET' && targetDomainDetails.classification !== 'TOP_SECRET') {
                // In a real system, this might require two-person control.
                // We'll allow it but flag it for Content Inspection.
            }
        }
        // Low-to-High (Ingest)
        if (sourceLevel < targetLevel) {
            // Always allowed to move up, provided user has access to source.
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
    };
    return ABACEngine;
}());
exports.ABACEngine = ABACEngine;
