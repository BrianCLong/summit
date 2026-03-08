"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evolveBehavior = evolveBehavior;
exports.applyPressure = applyPressure;
exports.calculateSensitivity = calculateSensitivity;
exports.applyStability = applyStability;
exports.addStochasticNoise = addStochasticNoise;
exports.applyRegressionToMean = applyRegressionToMean;
exports.adaptBehavior = adaptBehavior;
exports.calculateChangeRate = calculateChangeRate;
const BehavioralProfile_js_1 = require("../models/BehavioralProfile.js");
/**
 * Evolves a behavioral profile under environmental pressures
 */
function evolveBehavior(profile, pressures, mutationRate = 0.15, stabilityCoefficient = 0.5) {
    let evolved = (0, BehavioralProfile_js_1.cloneProfile)(profile);
    // Apply each pressure vector
    for (const pressure of pressures) {
        evolved = applyPressure(evolved, pressure, mutationRate);
    }
    // Apply stability (resistance to change)
    evolved = applyStability(evolved, profile, stabilityCoefficient);
    // Add random variation for unpredictability
    evolved = addStochasticNoise(evolved, mutationRate * 0.2);
    // Clamp all values to valid ranges
    return (0, BehavioralProfile_js_1.clampProfile)(evolved);
}
/**
 * Applies a single pressure vector to a behavioral profile
 */
function applyPressure(profile, pressure, mutationRate) {
    const evolved = (0, BehavioralProfile_js_1.cloneProfile)(profile);
    // Calculate sensitivity to this pressure type
    const sensitivity = calculateSensitivity(profile, pressure.type);
    // Calculate effective magnitude
    const magnitude = pressure.strength * sensitivity * mutationRate;
    // Apply pressure-specific mutations
    switch (pressure.type) {
        case 'ECONOMIC':
            evolved.resourceSeeking += magnitude * 0.8;
            evolved.riskTolerance -= magnitude * 0.5;
            evolved.operationalTempo *= 1 + magnitude * 0.3;
            evolved.networkExpansion += magnitude * 0.4; // Seek new resources
            break;
        case 'POLITICAL':
            evolved.alignmentShift += magnitude * 0.7;
            evolved.operationalTempo *= 1 + magnitude * 0.5;
            evolved.riskTolerance += magnitude * 0.3;
            evolved.influenceSeeking += magnitude * 0.6;
            break;
        case 'SOCIAL':
            evolved.networkExpansion += magnitude * 0.8;
            evolved.trustRadius *= 1 - magnitude * 0.3;
            evolved.influenceSeeking += magnitude * 0.5;
            evolved.activityLevel += magnitude * 0.4;
            break;
        case 'TECHNOLOGICAL':
            evolved.capabilityAcquisition += magnitude * 0.9;
            evolved.tacticalInnovation += magnitude * 0.7;
            evolved.operationalTempo *= 1 + magnitude * 0.4;
            evolved.resourceSeeking += magnitude * 0.5;
            break;
        case 'OPERATIONAL':
            evolved.activityLevel += magnitude * 0.8;
            evolved.operationalTempo *= 1 + magnitude;
            evolved.riskTolerance += magnitude * 0.3;
            evolved.tacticalInnovation += magnitude * 0.4;
            break;
    }
    return evolved;
}
/**
 * Calculates sensitivity to a specific pressure type based on current profile
 */
function calculateSensitivity(profile, pressureType) {
    switch (pressureType) {
        case 'ECONOMIC':
            // Entities with high resource-seeking are more sensitive to economic pressure
            return 0.5 + profile.resourceSeeking * 0.5;
        case 'POLITICAL':
            // Entities with alignment shifts are more sensitive to political pressure
            return 0.5 + Math.abs(profile.alignmentShift) * 0.5;
        case 'SOCIAL':
            // Entities with high influence-seeking are more sensitive to social pressure
            return 0.5 + profile.influenceSeeking * 0.5;
        case 'TECHNOLOGICAL':
            // Entities with high innovation are more sensitive to technological pressure
            return 0.5 + profile.tacticalInnovation * 0.5;
        case 'OPERATIONAL':
            // Entities with high activity are more sensitive to operational pressure
            return 0.5 + profile.activityLevel * 0.5;
        default:
            return 0.5;
    }
}
/**
 * Applies stability coefficient to resist behavioral changes
 */
function applyStability(evolved, original, stabilityCoefficient) {
    // Higher stability means more resistance to change
    // Interpolate between evolved and original based on stability
    const retention = stabilityCoefficient;
    const change = 1 - stabilityCoefficient;
    return {
        activityLevel: original.activityLevel * retention + evolved.activityLevel * change,
        operationalTempo: original.operationalTempo * retention + evolved.operationalTempo * change,
        riskTolerance: original.riskTolerance * retention + evolved.riskTolerance * change,
        alignmentShift: original.alignmentShift * retention + evolved.alignmentShift * change,
        resourceSeeking: original.resourceSeeking * retention + evolved.resourceSeeking * change,
        capabilityAcquisition: original.capabilityAcquisition * retention +
            evolved.capabilityAcquisition * change,
        networkExpansion: original.networkExpansion * retention + evolved.networkExpansion * change,
        trustRadius: original.trustRadius * retention + evolved.trustRadius * change,
        influenceSeeking: original.influenceSeeking * retention + evolved.influenceSeeking * change,
        tacticalInnovation: original.tacticalInnovation * retention +
            evolved.tacticalInnovation * change,
        stabilityCoefficient: original.stabilityCoefficient, // Stability itself doesn't change
    };
}
/**
 * Adds stochastic noise for unpredictability
 */
function addStochasticNoise(profile, noiseLevel) {
    const noise = () => (Math.random() - 0.5) * 2 * noiseLevel;
    return {
        activityLevel: profile.activityLevel + noise(),
        operationalTempo: profile.operationalTempo * (1 + noise() * 0.5),
        riskTolerance: profile.riskTolerance + noise(),
        alignmentShift: profile.alignmentShift + noise(),
        resourceSeeking: profile.resourceSeeking + noise(),
        capabilityAcquisition: profile.capabilityAcquisition + noise(),
        networkExpansion: profile.networkExpansion + noise(),
        trustRadius: profile.trustRadius * (1 + noise() * 0.5),
        influenceSeeking: profile.influenceSeeking + noise(),
        tacticalInnovation: profile.tacticalInnovation + noise(),
        stabilityCoefficient: profile.stabilityCoefficient, // Don't add noise to stability
    };
}
/**
 * Applies regression to mean over time
 */
function applyRegressionToMean(profile, mean, regressionRate = 0.05) {
    // Gradually pull extreme values back toward mean
    return {
        activityLevel: profile.activityLevel + (mean.activityLevel - profile.activityLevel) * regressionRate,
        operationalTempo: profile.operationalTempo +
            (mean.operationalTempo - profile.operationalTempo) * regressionRate,
        riskTolerance: profile.riskTolerance + (mean.riskTolerance - profile.riskTolerance) * regressionRate,
        alignmentShift: profile.alignmentShift + (mean.alignmentShift - profile.alignmentShift) * regressionRate,
        resourceSeeking: profile.resourceSeeking + (mean.resourceSeeking - profile.resourceSeeking) * regressionRate,
        capabilityAcquisition: profile.capabilityAcquisition +
            (mean.capabilityAcquisition - profile.capabilityAcquisition) * regressionRate,
        networkExpansion: profile.networkExpansion +
            (mean.networkExpansion - profile.networkExpansion) * regressionRate,
        trustRadius: profile.trustRadius + (mean.trustRadius - profile.trustRadius) * regressionRate,
        influenceSeeking: profile.influenceSeeking +
            (mean.influenceSeeking - profile.influenceSeeking) * regressionRate,
        tacticalInnovation: profile.tacticalInnovation +
            (mean.tacticalInnovation - profile.tacticalInnovation) * regressionRate,
        stabilityCoefficient: profile.stabilityCoefficient,
    };
}
/**
 * Simulates behavioral adaptation based on feedback
 */
function adaptBehavior(profile, outcome, adaptationRate = 0.1) {
    const adapted = (0, BehavioralProfile_js_1.cloneProfile)(profile);
    if (outcome === 'SUCCESS') {
        // Reinforce successful behaviors
        adapted.activityLevel *= 1 + adaptationRate * 0.1;
        adapted.riskTolerance += adaptationRate * 0.05;
        adapted.tacticalInnovation += adaptationRate * 0.1;
    }
    else {
        // Modify behaviors after failure
        adapted.riskTolerance -= adaptationRate * 0.1;
        adapted.tacticalInnovation += adaptationRate * 0.15; // Try new approaches
        adapted.activityLevel *= 1 - adaptationRate * 0.05;
    }
    return (0, BehavioralProfile_js_1.clampProfile)(adapted);
}
/**
 * Calculates the rate of behavioral change over time
 */
function calculateChangeRate(profile1, profile2, timeElapsed) {
    const totalChange = Math.abs(profile2.activityLevel - profile1.activityLevel) +
        Math.abs(profile2.operationalTempo - profile1.operationalTempo) / 10 +
        Math.abs(profile2.riskTolerance - profile1.riskTolerance) +
        Math.abs(profile2.alignmentShift - profile1.alignmentShift) +
        Math.abs(profile2.resourceSeeking - profile1.resourceSeeking) +
        Math.abs(profile2.capabilityAcquisition - profile1.capabilityAcquisition) +
        Math.abs(profile2.networkExpansion - profile1.networkExpansion) +
        Math.abs(profile2.trustRadius - profile1.trustRadius) / 10 +
        Math.abs(profile2.influenceSeeking - profile1.influenceSeeking) +
        Math.abs(profile2.tacticalInnovation - profile1.tacticalInnovation);
    return timeElapsed > 0 ? totalChange / timeElapsed : 0;
}
