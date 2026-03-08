"use strict";
// @ts-nocheck
/**
 * Canonical Entity: Decision
 *
 * Represents decision nodes in the IntelGraph system for tracking
 * decisions made with evidence and policy context.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDecision = createDecision;
/**
 * Create a new Decision entity
 */
function createDecision(data, baseFields, provenanceId) {
    return {
        ...baseFields,
        ...data,
        entityType: 'Decision',
        schemaVersion: '1.0.0',
        provenanceId,
    };
}
