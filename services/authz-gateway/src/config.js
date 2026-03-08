"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.features = void 0;
exports.setFeatureOverrides = setFeatureOverrides;
exports.features = {
    policyReasoner: process.env.FEATURES_POLICY_REASONER === 'false' ? false : true,
};
function setFeatureOverrides(overrides) {
    if (typeof overrides.policyReasoner === 'boolean') {
        exports.features.policyReasoner = overrides.policyReasoner;
    }
}
