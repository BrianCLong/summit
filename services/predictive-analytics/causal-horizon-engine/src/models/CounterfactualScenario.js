"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createScenario = createScenario;
exports.calculateComparison = calculateComparison;
exports.performSensitivityAnalysis = performSensitivityAnalysis;
exports.estimateConfidenceInterval = estimateConfidenceInterval;
const uuid_1 = require("uuid");
/**
 * Create a new counterfactual scenario
 */
function createScenario(graphId, name, interventions, target, description, evidence) {
    return {
        id: (0, uuid_1.v4)(),
        name,
        description,
        graphId,
        interventions,
        target,
        evidence,
        createdAt: new Date(),
    };
}
/**
 * Calculate comparison between factual and counterfactual outcomes
 */
function calculateComparison(factualValue, counterfactualValue) {
    const absoluteDifference = counterfactualValue - factualValue;
    const percentChange = factualValue !== 0 ? (absoluteDifference / Math.abs(factualValue)) * 100 : 0;
    const causalEffect = absoluteDifference;
    return {
        factualValue,
        counterfactualValue,
        absoluteDifference,
        percentChange,
        causalEffect,
    };
}
/**
 * Perform sensitivity analysis for unmeasured confounding
 * Based on E-value approach (VanderWeele & Ding, 2017)
 */
function performSensitivityAnalysis(causalEffect, standardError) {
    // E-value: minimum strength of association (on risk ratio scale) that
    // an unmeasured confounder would need to have with both treatment and
    // outcome to explain away the observed effect
    const riskRatio = Math.exp(causalEffect / standardError);
    const eValue = riskRatio + Math.sqrt(riskRatio * (riskRatio - 1));
    const robustnessValue = 1 / eValue; // Inverse for interpretability
    const isRobust = eValue > 2; // Convention: E-value > 2 indicates robustness
    let explanation = '';
    if (isRobust) {
        explanation = `The causal effect is robust to unmeasured confounding. An unmeasured confounder would need to have a risk ratio of ${eValue.toFixed(2)} with both the intervention and outcome to explain away the observed effect.`;
    }
    else {
        explanation = `The causal effect may be sensitive to unmeasured confounding. A relatively weak confounder (risk ratio ${eValue.toFixed(2)}) could potentially explain away the observed effect.`;
    }
    return {
        robustnessValue,
        confoundingStrengthRequired: eValue,
        isRobust,
        explanation,
    };
}
/**
 * Estimate confidence interval using bootstrap or analytical methods
 */
function estimateConfidenceInterval(pointEstimate, standardError, confidenceLevel = 0.95) {
    // Using normal approximation
    const z = 1.96; // For 95% confidence
    const margin = z * standardError;
    return [pointEstimate - margin, pointEstimate + margin];
}
