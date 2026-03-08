"use strict";
// @ts-nocheck
/**
 * Canonical Entity: Claim
 *
 * Represents assertions, allegations, or statements that may be verified
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClaim = createClaim;
/**
 * Create a new Claim entity
 */
function createClaim(data, baseFields, provenanceId) {
    return {
        ...baseFields,
        ...data,
        entityType: 'Claim',
        schemaVersion: '1.0.0',
        provenanceId,
    };
}
