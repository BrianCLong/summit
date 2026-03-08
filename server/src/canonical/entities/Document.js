"use strict";
// @ts-nocheck
/**
 * Canonical Entity: Document
 *
 * Represents documents, files, and records
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDocument = createDocument;
/**
 * Create a new Document entity
 */
function createDocument(data, baseFields, provenanceId) {
    return {
        ...baseFields,
        ...data,
        entityType: 'Document',
        schemaVersion: '1.0.0',
        provenanceId,
    };
}
