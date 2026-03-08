"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRESSURE_SCENARIOS = void 0;
exports.getEffectiveStrength = getEffectiveStrength;
exports.isPressureActive = isPressureActive;
exports.getActivePressures = getActivePressures;
exports.getCombinedPressureByType = getCombinedPressureByType;
exports.validatePressure = validatePressure;
exports.createPressure = createPressure;
/**
 * Calculates the effective strength of a pressure at a given time
 */
function getEffectiveStrength(pressure, currentTime) {
    // Pressure hasn't started yet
    if (currentTime < pressure.onset) {
        return 0;
    }
    // Pressure has ended
    const timeSinceOnset = currentTime - pressure.onset;
    if (timeSinceOnset >= pressure.duration) {
        return 0;
    }
    // Apply exponential decay over duration
    const decayFactor = Math.pow(1 - pressure.decay, timeSinceOnset);
    return pressure.strength * decayFactor;
}
/**
 * Checks if a pressure is active at a given time
 */
function isPressureActive(pressure, currentTime) {
    return getEffectiveStrength(pressure, currentTime) > 0.01; // Threshold for significance
}
/**
 * Gets all active pressures at a specific time
 */
function getActivePressures(pressures, currentTime) {
    return pressures.filter((p) => isPressureActive(p, currentTime));
}
/**
 * Calculates combined pressure strength by type at a given time
 */
function getCombinedPressureByType(pressures, type, currentTime) {
    return pressures
        .filter((p) => p.type === type)
        .reduce((sum, p) => sum + getEffectiveStrength(p, currentTime), 0);
}
/**
 * Validates a pressure vector
 */
function validatePressure(pressure) {
    if (pressure.strength < 0 || pressure.strength > 1) {
        return false;
    }
    if (pressure.duration <= 0) {
        return false;
    }
    if (pressure.decay < 0 || pressure.decay > 1) {
        return false;
    }
    if (pressure.onset < 0) {
        return false;
    }
    return true;
}
/**
 * Creates a pressure vector with default values
 */
function createPressure(type, strength, duration, onset = 0, decay = 0.1, source) {
    return {
        type,
        strength: Math.max(0, Math.min(1, strength)),
        duration: Math.max(1, duration),
        decay: Math.max(0, Math.min(1, decay)),
        onset: Math.max(0, onset),
        source,
    };
}
/**
 * Predefined common pressure scenarios
 */
exports.PRESSURE_SCENARIOS = {
    BASELINE: {
        id: 'baseline',
        name: 'Baseline Continuation',
        pressures: [
            createPressure('ECONOMIC', 0.1, 24, 0, 0.05),
            createPressure('POLITICAL', 0.1, 24, 0, 0.05),
        ],
    },
    ECONOMIC_CRISIS: {
        id: 'economic_crisis',
        name: 'Economic Collapse',
        pressures: [
            createPressure('ECONOMIC', 0.8, 12, 3, 0.15),
            createPressure('POLITICAL', 0.5, 18, 6, 0.1),
            createPressure('SOCIAL', 0.6, 15, 4, 0.12),
        ],
    },
    TECHNOLOGICAL_LEAP: {
        id: 'technological_leap',
        name: 'Technological Breakthrough',
        pressures: [
            createPressure('TECHNOLOGICAL', 0.9, 6, 0, 0.2),
            createPressure('ECONOMIC', 0.4, 12, 2, 0.15),
        ],
    },
    POLITICAL_INSTABILITY: {
        id: 'political_instability',
        name: 'Political Upheaval',
        pressures: [
            createPressure('POLITICAL', 0.9, 18, 0, 0.1),
            createPressure('SOCIAL', 0.7, 12, 1, 0.15),
            createPressure('OPERATIONAL', 0.6, 15, 2, 0.12),
        ],
    },
    HEIGHTENED_OPERATIONS: {
        id: 'heightened_operations',
        name: 'Operational Surge',
        pressures: [
            createPressure('OPERATIONAL', 0.8, 9, 0, 0.18),
            createPressure('ECONOMIC', 0.3, 12, 1, 0.1),
        ],
    },
};
