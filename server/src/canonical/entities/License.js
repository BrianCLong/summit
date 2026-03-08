"use strict";
// @ts-nocheck
/**
 * Canonical Entity: License
 *
 * Represents a license or permit with bitemporal tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLicense = createLicense;
/**
 * Create a new License entity
 */
function createLicense(data, baseFields, provenanceId) {
    return {
        ...baseFields,
        ...data,
        entityType: 'License',
        schemaVersion: '1.0.0',
        provenanceId,
    };
}
