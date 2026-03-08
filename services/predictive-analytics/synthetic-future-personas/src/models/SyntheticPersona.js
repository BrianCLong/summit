"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PERSONA_CONFIG = void 0;
exports.validatePersona = validatePersona;
exports.isPersonaValid = isPersonaValid;
exports.getPersonaTimeRemaining = getPersonaTimeRemaining;
exports.DEFAULT_PERSONA_CONFIG = {
    mutationRate: 0.15,
    branchingFactor: 3,
    validityWindow: 15552000000, // 6 months in milliseconds
    stabilityCoefficient: 0.5,
};
/**
 * Validates that a synthetic persona has all required fields with valid values
 */
function validatePersona(persona) {
    if (!persona.id || !persona.sourceEntityId) {
        return false;
    }
    if (persona.mutationRate < 0 ||
        persona.mutationRate > 1 ||
        persona.stabilityCoefficient < 0 ||
        persona.stabilityCoefficient > 1) {
        return false;
    }
    if (!persona.metadata ||
        !persona.metadata.createdAt ||
        !persona.metadata.validUntil) {
        return false;
    }
    return true;
}
/**
 * Checks if a persona is still valid based on its validUntil timestamp
 */
function isPersonaValid(persona) {
    return Date.now() < persona.metadata.validUntil;
}
/**
 * Calculates how much time remains before persona expires
 */
function getPersonaTimeRemaining(persona) {
    return Math.max(0, persona.metadata.validUntil - Date.now());
}
