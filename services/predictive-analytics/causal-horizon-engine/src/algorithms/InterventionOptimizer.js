"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOptimalInterventions = findOptimalInterventions;
exports.greedySearch = greedySearch;
exports.beamSearch = beamSearch;
exports.evaluateCostEffectiveness = evaluateCostEffectiveness;
exports.findParetoOptimal = findParetoOptimal;
const Intervention_js_1 = require("../models/Intervention.js");
const combinatorics_js_1 = require("../utils/combinatorics.js");
const CounterfactualSimulation_js_1 = require("./CounterfactualSimulation.js");
/**
 * Find optimal intervention sets to achieve target outcome
 */
function findOptimalInterventions(graph, target, constraints = {}) {
    // Get candidate intervention variables (ancestors of target)
    const targetAncestors = graph.getAncestors(target.variable);
    let candidates = Array.from(targetAncestors);
    // Filter out forbidden variables
    if (constraints.forbiddenVariables) {
        candidates = candidates.filter((v) => !constraints.forbiddenVariables.includes(v));
    }
    // Add required variables to candidates if not already present
    if (constraints.requiredVariables) {
        for (const required of constraints.requiredVariables) {
            if (!candidates.includes(required)) {
                candidates.push(required);
            }
        }
    }
    const interventionSets = [];
    const maxSize = constraints.maxInterventions || candidates.length;
    // Try intervention sets of increasing size
    for (let size = 1; size <= Math.min(maxSize, candidates.length); size++) {
        const sets = (0, combinatorics_js_1.combinations)(candidates, size);
        for (const interventionVars of sets) {
            // Skip if required variables are missing
            if (constraints.requiredVariables) {
                const hasAllRequired = constraints.requiredVariables.every((v) => interventionVars.includes(v));
                if (!hasAllRequired)
                    continue;
            }
            // Create interventions (set to optimal values)
            const interventions = interventionVars.map((variable) => createOptimalIntervention(graph, variable, target));
            // Check constraints
            if (!(0, Intervention_js_1.satisfiesConstraints)(interventions, constraints)) {
                continue;
            }
            // Simulate intervention to get expected effect
            const result = (0, CounterfactualSimulation_js_1.simulateCounterfactual)(graph, interventions, target);
            // Check if meets threshold
            if (target.threshold &&
                result.outcome.probability < target.threshold) {
                continue;
            }
            const interventionSet = {
                interventions,
                totalCost: (0, Intervention_js_1.calculateTotalCost)(interventions),
                expectedEffect: result.outcome.probability,
                confidence: result.outcome.confidenceInterval
                    ? 1 -
                        (result.outcome.confidenceInterval[1] -
                            result.outcome.confidenceInterval[0]) /
                            2
                    : 0.8,
            };
            interventionSets.push(interventionSet);
        }
        // If we found satisfactory interventions at this size, stop
        if (interventionSets.length > 0) {
            break;
        }
    }
    // Sort by expected effect and cost
    interventionSets.sort(Intervention_js_1.compareInterventionSets);
    // Assign ranks
    interventionSets.forEach((set, index) => {
        set.rank = index + 1;
    });
    return interventionSets;
}
/**
 * Create optimal intervention for a variable to maximize effect on target
 */
function createOptimalIntervention(graph, variable, target) {
    const node = graph.getNode(variable);
    // Determine optimal value based on domain
    let value;
    let cost = 1000; // Default cost
    if (node) {
        switch (node.domain) {
            case 'BINARY':
                value = true; // Or determine based on effect direction
                cost = 500;
                break;
            case 'DISCRETE':
                value = 'optimal'; // Would be determined by simulation
                cost = 750;
                break;
            case 'CONTINUOUS':
                value = 1.0; // Would be optimized
                cost = 1000;
                break;
            default:
                value = 'intervened';
                cost = 1000;
        }
    }
    else {
        value = 'intervened';
    }
    return {
        variable,
        value,
        type: Intervention_js_1.InterventionType.HARD,
        cost,
        feasibility: 0.8,
    };
}
/**
 * Greedy search for optimal interventions
 * Iteratively add the intervention with highest marginal benefit
 */
function greedySearch(graph, target, constraints = {}) {
    const candidates = Array.from(graph.getAncestors(target.variable));
    const selectedInterventions = [];
    let currentEffect = 0;
    while (selectedInterventions.length < (constraints.maxInterventions || 10)) {
        let bestIntervention = null;
        let bestMarginalEffect = 0;
        for (const variable of candidates) {
            // Skip if already selected
            if (selectedInterventions.some((i) => i.variable === variable)) {
                continue;
            }
            // Skip if forbidden
            if (constraints.forbiddenVariables?.includes(variable)) {
                continue;
            }
            // Create intervention
            const intervention = createOptimalIntervention(graph, variable, target);
            // Test with current interventions
            const testInterventions = [...selectedInterventions, intervention];
            // Check constraints
            if (!(0, Intervention_js_1.satisfiesConstraints)(testInterventions, constraints)) {
                continue;
            }
            // Simulate effect
            const result = (0, CounterfactualSimulation_js_1.simulateCounterfactual)(graph, testInterventions, target);
            const marginalEffect = result.outcome.probability - currentEffect;
            if (marginalEffect > bestMarginalEffect) {
                bestMarginalEffect = marginalEffect;
                bestIntervention = intervention;
            }
        }
        // If no improvement, stop
        if (!bestIntervention || bestMarginalEffect <= 0) {
            break;
        }
        selectedInterventions.push(bestIntervention);
        currentEffect += bestMarginalEffect;
        // Check if target is met
        if (target.threshold && currentEffect >= target.threshold) {
            break;
        }
    }
    if (selectedInterventions.length === 0) {
        return null;
    }
    return {
        interventions: selectedInterventions,
        totalCost: (0, Intervention_js_1.calculateTotalCost)(selectedInterventions),
        expectedEffect: currentEffect,
        confidence: 0.8,
        rank: 1,
    };
}
/**
 * Beam search for optimal interventions
 * Maintains top-k partial solutions at each step
 */
function beamSearch(graph, target, constraints = {}, beamWidth = 5) {
    const candidates = Array.from(graph.getAncestors(target.variable));
    let beam = [
        {
            interventions: [],
            totalCost: 0,
            expectedEffect: 0,
            confidence: 1,
        },
    ];
    const maxDepth = constraints.maxInterventions || Math.min(5, candidates.length);
    for (let depth = 0; depth < maxDepth; depth++) {
        const nextBeam = [];
        for (const current of beam) {
            // Try adding each candidate
            for (const variable of candidates) {
                // Skip if already in this set
                if (current.interventions.some((i) => i.variable === variable)) {
                    continue;
                }
                // Create new intervention
                const intervention = createOptimalIntervention(graph, variable, target);
                const newInterventions = [...current.interventions, intervention];
                // Check constraints
                if (!(0, Intervention_js_1.satisfiesConstraints)(newInterventions, constraints)) {
                    continue;
                }
                // Simulate
                const result = (0, CounterfactualSimulation_js_1.simulateCounterfactual)(graph, newInterventions, target);
                const newSet = {
                    interventions: newInterventions,
                    totalCost: (0, Intervention_js_1.calculateTotalCost)(newInterventions),
                    expectedEffect: result.outcome.probability,
                    confidence: 0.8,
                };
                nextBeam.push(newSet);
            }
        }
        // Keep top-k
        nextBeam.sort(Intervention_js_1.compareInterventionSets);
        beam = nextBeam.slice(0, beamWidth);
        // If no improvements, stop
        if (beam.length === 0) {
            break;
        }
    }
    // Assign ranks
    beam.forEach((set, index) => {
        set.rank = index + 1;
    });
    return beam;
}
/**
 * Evaluate cost-effectiveness of an intervention set
 */
function evaluateCostEffectiveness(interventionSet) {
    if (interventionSet.totalCost === 0) {
        return interventionSet.expectedEffect;
    }
    return interventionSet.expectedEffect / interventionSet.totalCost;
}
/**
 * Find Pareto optimal intervention sets
 * Sets that are not dominated in both cost and effect
 */
function findParetoOptimal(interventionSets) {
    const pareto = [];
    for (const set of interventionSets) {
        let isDominated = false;
        for (const other of interventionSets) {
            if (set === other)
                continue;
            // Check if 'other' dominates 'set'
            // (better or equal on both dimensions, strictly better on at least one)
            const betterEffect = other.expectedEffect >= set.expectedEffect;
            const betterCost = other.totalCost <= set.totalCost;
            const strictlyBetter = other.expectedEffect > set.expectedEffect ||
                other.totalCost < set.totalCost;
            if (betterEffect && betterCost && strictlyBetter) {
                isDominated = true;
                break;
            }
        }
        if (!isDominated) {
            pareto.push(set);
        }
    }
    return pareto;
}
