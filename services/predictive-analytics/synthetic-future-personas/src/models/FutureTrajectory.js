"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTrajectory = validateTrajectory;
exports.getStateAtTime = getStateAtTime;
exports.getPressuresAtTime = getPressuresAtTime;
exports.calculateTotalDivergence = calculateTotalDivergence;
exports.findMaxDivergenceTime = findMaxDivergenceTime;
/**
 * Validates a future trajectory
 */
function validateTrajectory(trajectory) {
    if (!trajectory.id || !trajectory.personaId || !trajectory.scenarioId) {
        return false;
    }
    if (trajectory.timeHorizon <= 0) {
        return false;
    }
    if (trajectory.likelihood < 0 || trajectory.likelihood > 1) {
        return false;
    }
    if (!trajectory.steps || trajectory.steps.length === 0) {
        return false;
    }
    return true;
}
/**
 * Gets the state at a specific time offset
 */
function getStateAtTime(trajectory, time) {
    const step = trajectory.steps.find((s) => s.time === time);
    return step ? step.state : null;
}
/**
 * Gets all pressures active at a specific time
 */
function getPressuresAtTime(trajectory, time) {
    const step = trajectory.steps.find((s) => s.time === time);
    return step ? step.pressuresApplied : [];
}
/**
 * Calculates total divergence from baseline across trajectory
 */
function calculateTotalDivergence(trajectory) {
    let totalDivergence = 0;
    for (const step of trajectory.steps) {
        const delta = step.deltaFromBaseline;
        const stepDivergence = Math.abs(delta.activityLevel) +
            Math.abs(delta.operationalTempo) / 10 +
            Math.abs(delta.riskTolerance) +
            Math.abs(delta.alignmentShift) +
            Math.abs(delta.resourceSeeking) +
            Math.abs(delta.capabilityAcquisition) +
            Math.abs(delta.networkExpansion) +
            Math.abs(delta.trustRadius) / 10 +
            Math.abs(delta.influenceSeeking) +
            Math.abs(delta.tacticalInnovation);
        totalDivergence += stepDivergence;
    }
    return totalDivergence / trajectory.steps.length;
}
/**
 * Finds the time of maximum divergence from baseline
 */
function findMaxDivergenceTime(trajectory) {
    let maxDivergence = 0;
    let maxTime = 0;
    for (const step of trajectory.steps) {
        const delta = step.deltaFromBaseline;
        const divergence = Math.abs(delta.activityLevel) +
            Math.abs(delta.operationalTempo) / 10 +
            Math.abs(delta.riskTolerance) +
            Math.abs(delta.alignmentShift) +
            Math.abs(delta.resourceSeeking) +
            Math.abs(delta.capabilityAcquisition) +
            Math.abs(delta.networkExpansion) +
            Math.abs(delta.trustRadius) / 10 +
            Math.abs(delta.influenceSeeking) +
            Math.abs(delta.tacticalInnovation);
        if (divergence > maxDivergence) {
            maxDivergence = divergence;
            maxTime = step.time;
        }
    }
    return { time: maxTime, divergence: maxDivergence };
}
