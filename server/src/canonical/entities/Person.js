"use strict";
// @ts-nocheck
/**
 * Canonical Entity: Person
 *
 * Represents an individual person with bitemporal tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPerson = createPerson;
/**
 * Create a new Person entity
 */
function createPerson(data, baseFields, provenanceId) {
    return {
        ...baseFields,
        ...data,
        entityType: 'Person',
        schemaVersion: '1.0.0',
        provenanceId,
    };
}
