"use strict";
// @ts-nocheck
/**
 * Canonical Entity: Narrative
 *
 * Represents a narrative or storyline with bitemporal tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNarrative = createNarrative;
/**
 * Create a new Narrative entity
 */
function createNarrative(data, baseFields, provenanceId) {
    return {
        ...baseFields,
        ...data,
        entityType: 'Narrative',
        schemaVersion: '1.0.0',
        provenanceId,
    };
}
