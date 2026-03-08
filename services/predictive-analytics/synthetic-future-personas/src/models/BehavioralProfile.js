"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_BEHAVIORAL_PROFILE = void 0;
exports.calculateDelta = calculateDelta;
exports.calculateDistance = calculateDistance;
exports.validateProfile = validateProfile;
exports.clampProfile = clampProfile;
exports.cloneProfile = cloneProfile;
exports.interpolateProfiles = interpolateProfiles;
/**
 * Default baseline behavioral profile for new personas
 */
exports.DEFAULT_BEHAVIORAL_PROFILE = {
    activityLevel: 0.5,
    operationalTempo: 1.0,
    riskTolerance: 0.5,
    alignmentShift: 0.0,
    resourceSeeking: 0.5,
    capabilityAcquisition: 0.3,
    networkExpansion: 0.4,
    trustRadius: 5.0,
    influenceSeeking: 0.5,
    tacticalInnovation: 0.3,
    stabilityCoefficient: 0.5,
};
/**
 * Calculates the delta between two behavioral profiles
 */
function calculateDelta(current, baseline) {
    return {
        activityLevel: current.activityLevel - baseline.activityLevel,
        operationalTempo: current.operationalTempo - baseline.operationalTempo,
        riskTolerance: current.riskTolerance - baseline.riskTolerance,
        alignmentShift: current.alignmentShift - baseline.alignmentShift,
        resourceSeeking: current.resourceSeeking - baseline.resourceSeeking,
        capabilityAcquisition: current.capabilityAcquisition - baseline.capabilityAcquisition,
        networkExpansion: current.networkExpansion - baseline.networkExpansion,
        trustRadius: current.trustRadius - baseline.trustRadius,
        influenceSeeking: current.influenceSeeking - baseline.influenceSeeking,
        tacticalInnovation: current.tacticalInnovation - baseline.tacticalInnovation,
    };
}
/**
 * Calculates Euclidean distance between two behavioral profiles
 */
function calculateDistance(profile1, profile2) {
    const delta = calculateDelta(profile1, profile2);
    const sumSquares = Math.pow(delta.activityLevel, 2) +
        Math.pow(delta.operationalTempo / 10, 2) + // Normalize tempo
        Math.pow(delta.riskTolerance, 2) +
        Math.pow(delta.alignmentShift, 2) +
        Math.pow(delta.resourceSeeking, 2) +
        Math.pow(delta.capabilityAcquisition, 2) +
        Math.pow(delta.networkExpansion, 2) +
        Math.pow(delta.trustRadius / 10, 2) + // Normalize trust radius
        Math.pow(delta.influenceSeeking, 2) +
        Math.pow(delta.tacticalInnovation, 2);
    return Math.sqrt(sumSquares);
}
/**
 * Validates that all behavioral dimensions are within valid ranges
 */
function validateProfile(profile) {
    // Check bounded dimensions (0.0 - 1.0)
    if (profile.activityLevel < 0 ||
        profile.activityLevel > 1 ||
        profile.riskTolerance < 0 ||
        profile.riskTolerance > 1 ||
        profile.resourceSeeking < 0 ||
        profile.resourceSeeking > 1 ||
        profile.influenceSeeking < 0 ||
        profile.influenceSeeking > 1 ||
        profile.stabilityCoefficient < 0 ||
        profile.stabilityCoefficient > 1) {
        return false;
    }
    // Check alignment shift (-1.0 to 1.0)
    if (profile.alignmentShift < -1 || profile.alignmentShift > 1) {
        return false;
    }
    // Check non-negative dimensions
    if (profile.operationalTempo < 0 ||
        profile.capabilityAcquisition < 0 ||
        profile.networkExpansion < 0 ||
        profile.trustRadius < 0 ||
        profile.tacticalInnovation < 0) {
        return false;
    }
    return true;
}
/**
 * Clamps a behavioral profile to valid ranges
 */
function clampProfile(profile) {
    return {
        activityLevel: Math.max(0, Math.min(1, profile.activityLevel)),
        operationalTempo: Math.max(0, profile.operationalTempo),
        riskTolerance: Math.max(0, Math.min(1, profile.riskTolerance)),
        alignmentShift: Math.max(-1, Math.min(1, profile.alignmentShift)),
        resourceSeeking: Math.max(0, Math.min(1, profile.resourceSeeking)),
        capabilityAcquisition: Math.max(0, profile.capabilityAcquisition),
        networkExpansion: Math.max(0, profile.networkExpansion),
        trustRadius: Math.max(0, profile.trustRadius),
        influenceSeeking: Math.max(0, Math.min(1, profile.influenceSeeking)),
        tacticalInnovation: Math.max(0, profile.tacticalInnovation),
        stabilityCoefficient: Math.max(0, Math.min(1, profile.stabilityCoefficient)),
    };
}
/**
 * Creates a copy of a behavioral profile
 */
function cloneProfile(profile) {
    return { ...profile };
}
/**
 * Interpolates between two behavioral profiles
 */
function interpolateProfiles(profile1, profile2, t) {
    const lerp = (a, b, t) => a + (b - a) * t;
    return {
        activityLevel: lerp(profile1.activityLevel, profile2.activityLevel, t),
        operationalTempo: lerp(profile1.operationalTempo, profile2.operationalTempo, t),
        riskTolerance: lerp(profile1.riskTolerance, profile2.riskTolerance, t),
        alignmentShift: lerp(profile1.alignmentShift, profile2.alignmentShift, t),
        resourceSeeking: lerp(profile1.resourceSeeking, profile2.resourceSeeking, t),
        capabilityAcquisition: lerp(profile1.capabilityAcquisition, profile2.capabilityAcquisition, t),
        networkExpansion: lerp(profile1.networkExpansion, profile2.networkExpansion, t),
        trustRadius: lerp(profile1.trustRadius, profile2.trustRadius, t),
        influenceSeeking: lerp(profile1.influenceSeeking, profile2.influenceSeeking, t),
        tacticalInnovation: lerp(profile1.tacticalInnovation, profile2.tacticalInnovation, t),
        stabilityCoefficient: lerp(profile1.stabilityCoefficient, profile2.stabilityCoefficient, t),
    };
}
