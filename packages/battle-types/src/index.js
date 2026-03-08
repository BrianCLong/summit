"use strict";
/**
 * @intelgraph/battle-types
 * Type definitions for Multidomain Data Fusion and Battle Management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CREDIBILITY_SCORES = exports.RELIABILITY_SCORES = exports.DOMAIN_WEIGHTS = void 0;
// =============================================================================
// DOMAIN WEIGHTS FOR FUSION
// =============================================================================
exports.DOMAIN_WEIGHTS = {
    SENSOR_GRID: 0.15,
    SATELLITE: 0.15,
    COMMS: 0.10,
    CYBER: 0.08,
    HUMINT: 0.12,
    SIGINT: 0.12,
    IMINT: 0.10,
    GEOINT: 0.08,
    OSINT: 0.04,
    ELINT: 0.03,
    MASINT: 0.02,
    EXTERNAL: 0.01,
};
exports.RELIABILITY_SCORES = {
    A: 1.0,
    B: 0.8,
    C: 0.6,
    D: 0.4,
    E: 0.2,
    F: 0.0,
};
exports.CREDIBILITY_SCORES = {
    1: 1.0, // Confirmed
    2: 0.8, // Probably true
    3: 0.6, // Possibly true
    4: 0.4, // Doubtful
    5: 0.2, // Improbable
    6: 0.0, // Cannot be judged
};
