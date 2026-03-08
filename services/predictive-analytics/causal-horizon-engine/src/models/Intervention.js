"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterventionType = void 0;
exports.validateIntervention = validateIntervention;
exports.calculateTotalCost = calculateTotalCost;
exports.satisfiesConstraints = satisfiesConstraints;
exports.mergeInterventions = mergeInterventions;
exports.compareInterventionSets = compareInterventionSets;
var InterventionType;
(function (InterventionType) {
    InterventionType["HARD"] = "HARD";
    InterventionType["SOFT"] = "SOFT";
})(InterventionType || (exports.InterventionType = InterventionType = {}));
/**
 * Validate intervention
 */
function validateIntervention(intervention) {
    if (!intervention.variable || intervention.variable.trim() === '') {
        return false;
    }
    if (intervention.value === undefined || intervention.value === null) {
        return false;
    }
    if (intervention.cost !== undefined && intervention.cost < 0) {
        return false;
    }
    if (intervention.feasibility !== undefined &&
        (intervention.feasibility < 0 || intervention.feasibility > 1)) {
        return false;
    }
    return true;
}
/**
 * Calculate total cost of intervention set
 */
function calculateTotalCost(interventions) {
    return interventions.reduce((sum, intervention) => {
        return sum + (intervention.cost || 0);
    }, 0);
}
/**
 * Check if intervention set satisfies constraints
 */
function satisfiesConstraints(interventions, constraints) {
    // Check max cost
    if (constraints.maxCost !== undefined) {
        const totalCost = calculateTotalCost(interventions);
        if (totalCost > constraints.maxCost) {
            return false;
        }
    }
    // Check max interventions
    if (constraints.maxInterventions !== undefined &&
        interventions.length > constraints.maxInterventions) {
        return false;
    }
    const variables = new Set(interventions.map((i) => i.variable));
    // Check required variables
    if (constraints.requiredVariables) {
        for (const required of constraints.requiredVariables) {
            if (!variables.has(required)) {
                return false;
            }
        }
    }
    // Check forbidden variables
    if (constraints.forbiddenVariables) {
        for (const forbidden of constraints.forbiddenVariables) {
            if (variables.has(forbidden)) {
                return false;
            }
        }
    }
    return true;
}
/**
 * Merge multiple interventions on the same variable (last one wins)
 */
function mergeInterventions(interventions) {
    const merged = new Map();
    for (const intervention of interventions) {
        merged.set(intervention.variable, intervention);
    }
    return Array.from(merged.values());
}
/**
 * Compare intervention sets by expected effect (descending)
 */
function compareInterventionSets(a, b) {
    // First, compare by expected effect (higher is better)
    if (a.expectedEffect !== b.expectedEffect) {
        return b.expectedEffect - a.expectedEffect;
    }
    // If effects are equal, prefer lower cost
    if (a.totalCost !== b.totalCost) {
        return a.totalCost - b.totalCost;
    }
    // If costs are equal, prefer fewer interventions
    return a.interventions.length - b.interventions.length;
}
