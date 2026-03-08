"use strict";
/**
 * ID generation utilities for decision graph objects
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.generateDeterministicId = generateDeterministicId;
exports.parseId = parseId;
exports.isValidId = isValidId;
exports.generateRunId = generateRunId;
exports.generateVersion = generateVersion;
exports.incrementVersion = incrementVersion;
const uuid_1 = require("uuid");
// Namespace UUIDs for deterministic ID generation
const NAMESPACES = {
    entity: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    claim: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
    evidence: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
    decision: '6ba7b813-9dad-11d1-80b4-00c04fd430c8',
    provenance: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
    relationship: '6ba7b815-9dad-11d1-80b4-00c04fd430c8',
    disclosure: '6ba7b816-9dad-11d1-80b4-00c04fd430c8',
};
/**
 * Generate a new random UUID for an object type
 */
function generateId(type) {
    return `${type}_${(0, uuid_1.v4)()}`;
}
/**
 * Generate a deterministic UUID based on content
 * Useful for deduplication and idempotent operations
 */
function generateDeterministicId(type, content) {
    const namespace = NAMESPACES[type];
    return `${type}_${(0, uuid_1.v5)(content, namespace)}`;
}
/**
 * Parse an ID to extract type and UUID
 */
function parseId(id) {
    const match = id.match(/^([a-z]+)_([0-9a-f-]{36})$/);
    if (!match)
        return null;
    return { type: match[1], uuid: match[2] };
}
/**
 * Validate that an ID is well-formed
 */
function isValidId(id, expectedType) {
    const parsed = parseId(id);
    if (!parsed)
        return false;
    if (expectedType && parsed.type !== expectedType)
        return false;
    return true;
}
/**
 * Generate a run ID for Maestro orchestration
 */
function generateRunId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `run_${timestamp}_${random}`;
}
/**
 * Generate a version string
 */
function generateVersion(major = 0, minor = 1, patch = 0) {
    return `${major}.${minor}.${patch}`;
}
/**
 * Increment version
 */
function incrementVersion(version, type = 'patch') {
    const [major, minor, patch] = version.split('.').map(Number);
    switch (type) {
        case 'major':
            return `${major + 1}.0.0`;
        case 'minor':
            return `${major}.${minor + 1}.0`;
        case 'patch':
        default:
            return `${major}.${minor}.${patch + 1}`;
    }
}
