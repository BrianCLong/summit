"use strict";
// @ts-nocheck
/**
 * Canonical Entity: Case
 *
 * Represents investigations, legal cases, or analytical case files
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCase = createCase;
/**
 * Create a new Case entity
 */
function createCase(data, baseFields, provenanceId) {
    return {
        ...baseFields,
        ...data,
        entityType: 'Case',
        schemaVersion: '1.0.0',
        provenanceId,
    };
}
