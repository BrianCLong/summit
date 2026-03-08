"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceTracker = void 0;
const types_js_1 = require("./types.js");
class GovernanceTracker {
    scorecards = new Map();
    waivers = [];
    updateScorecard(domain, driftRate, invariantViolations, mttrHours) {
        const card = {
            domain,
            driftRate,
            invariantViolations,
            mttrHours,
            updatedAt: new Date(),
        };
        this.scorecards.set(domain, card);
        return card;
    }
    getScorecards() {
        return Array.from(this.scorecards.values());
    }
    addWaiver(domain, description, expiresAt, owner) {
        const waiver = { id: (0, types_js_1.newIdentifier)(), domain, description, expiresAt, owner };
        this.waivers.push(waiver);
        return waiver;
    }
    activeWaivers() {
        const now = Date.now();
        return this.waivers.filter((waiver) => waiver.expiresAt.getTime() > now);
    }
}
exports.GovernanceTracker = GovernanceTracker;
