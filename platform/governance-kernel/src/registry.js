"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HighRiskUseCaseRegistry = void 0;
exports.getRiskProfile = getRiskProfile;
exports.HighRiskUseCaseRegistry = {
    defensive_security: { color: 'green', allowed: true },
    analytics: { color: 'green', allowed: true },
    foresight: { color: 'yellow', allowed: true }, // Conditional
    influence_operations: { color: 'red', allowed: false },
    authoritarian_surveillance: { color: 'hard_red', allowed: false }
};
function getRiskProfile(category) {
    return exports.HighRiskUseCaseRegistry[category];
}
