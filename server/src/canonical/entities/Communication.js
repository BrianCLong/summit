"use strict";
// @ts-nocheck
/**
 * Canonical Entity: Communication
 *
 * Represents a communication event with bitemporal tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCommunication = createCommunication;
/**
 * Create a new Communication entity
 */
function createCommunication(data, baseFields, provenanceId) {
    return {
        ...baseFields,
        ...data,
        entityType: 'Communication',
        schemaVersion: '1.0.0',
        provenanceId,
    };
}
