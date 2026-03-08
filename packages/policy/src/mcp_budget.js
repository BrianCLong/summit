"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_BUDGET = void 0;
exports.validateMCPBudget = validateMCPBudget;
exports.DEFAULT_BUDGET = {
    maxEnabled: 10,
    maxTools: 80,
};
function validateMCPBudget(enabledMCPs, // simplified type
totalTools, config = exports.DEFAULT_BUDGET) {
    const errors = [];
    if (enabledMCPs.length > config.maxEnabled) {
        errors.push(`Too many MCPs enabled: ${enabledMCPs.length} > ${config.maxEnabled}`);
    }
    if (totalTools > config.maxTools) {
        errors.push(`Too many total tools: ${totalTools} > ${config.maxTools}`);
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
