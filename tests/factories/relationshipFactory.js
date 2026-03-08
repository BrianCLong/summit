"use strict";
/**
 * Relationship Factory
 *
 * Generates test relationship data for graph operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.relationshipFactory = relationshipFactory;
exports.relationshipFactoryBatch = relationshipFactoryBatch;
exports.relationshipBetween = relationshipBetween;
const crypto_1 = require("crypto");
/**
 * Create a test relationship with optional overrides
 */
function relationshipFactory(options = {}) {
    const id = options.id || (0, crypto_1.randomUUID)();
    const type = options.type || 'RELATED_TO';
    const sourceId = options.sourceId || (0, crypto_1.randomUUID)();
    const targetId = options.targetId || (0, crypto_1.randomUUID)();
    const now = new Date();
    return {
        id,
        type,
        sourceId,
        targetId,
        properties: options.properties || {},
        createdAt: options.createdAt || now,
        updatedAt: options.updatedAt || now,
    };
}
/**
 * Create multiple test relationships
 */
function relationshipFactoryBatch(count, options = {}) {
    return Array.from({ length: count }, () => relationshipFactory(options));
}
/**
 * Create a relationship between two entities
 */
function relationshipBetween(sourceId, targetId, type = 'RELATED_TO', properties = {}) {
    return relationshipFactory({ sourceId, targetId, type, properties });
}
