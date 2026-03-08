"use strict";
// @ts-nocheck
/**
 * Canonical Entity: Evidence
 *
 * Represents evidence blobs/artifacts in the IntelGraph system
 * with provenance tracking and policy labels.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvidence = createEvidence;
/**
 * Create a new Evidence entity
 */
function createEvidence(data, baseFields, provenanceId) {
    return {
        ...baseFields,
        ...data,
        entityType: 'Evidence',
        schemaVersion: '1.0.0',
        provenanceId,
    };
}
