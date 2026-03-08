"use strict";
// @ts-nocheck
/**
 * Canonical Entity: Authority
 *
 * Represents a legal or regulatory authority
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthority = createAuthority;
function createAuthority(data, baseFields, provenanceId) {
    return {
        ...baseFields,
        ...data,
        entityType: 'Authority',
        schemaVersion: '1.0.0',
        provenanceId,
    };
}
