"use strict";
// @ts-nocheck
/**
 * Canonical Entity: Location
 *
 * Represents physical locations with varying levels of precision
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLocation = createLocation;
/**
 * Create a new Location entity
 */
function createLocation(data, baseFields, provenanceId) {
    return {
        ...baseFields,
        ...data,
        entityType: 'Location',
        schemaVersion: '1.0.0',
        provenanceId,
    };
}
