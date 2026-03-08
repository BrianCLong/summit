"use strict";
// @ts-nocheck
/**
 * Canonical Entity: Account
 *
 * Represents an online account or handle on a platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccount = createAccount;
function createAccount(data, baseFields, provenanceId) {
    return {
        ...baseFields,
        ...data,
        entityType: 'Account',
        schemaVersion: '1.0.0',
        provenanceId,
    };
}
