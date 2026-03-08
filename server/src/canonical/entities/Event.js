"use strict";
// @ts-nocheck
/**
 * Canonical Entity: Event
 *
 * Represents significant occurrences (meetings, transactions, incidents, etc.)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvent = createEvent;
/**
 * Create a new Event entity
 */
function createEvent(data, baseFields, provenanceId) {
    return {
        ...baseFields,
        ...data,
        entityType: 'Event',
        schemaVersion: '1.0.0',
        provenanceId,
    };
}
