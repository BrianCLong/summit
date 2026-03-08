"use strict";
// @ts-nocheck
/**
 * Canonical Entity: Organization
 *
 * Represents a business, government agency, NGO, or other organizational entity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrganization = createOrganization;
/**
 * Create a new Organization entity
 */
function createOrganization(data, baseFields, provenanceId) {
    return {
        ...baseFields,
        ...data,
        entityType: 'Organization',
        schemaVersion: '1.0.0',
        provenanceId,
    };
}
