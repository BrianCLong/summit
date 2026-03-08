"use strict";
// @ts-nocheck
/**
 * Canonical Entity: Asset
 *
 * Represents physical or digital assets (vehicles, real estate, cryptocurrency, etc.)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAsset = createAsset;
/**
 * Create a new Asset entity
 */
function createAsset(data, baseFields, provenanceId) {
    return {
        ...baseFields,
        ...data,
        entityType: 'Asset',
        schemaVersion: '1.0.0',
        provenanceId,
    };
}
