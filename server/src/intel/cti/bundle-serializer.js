"use strict";
// @ts-nocheck
/**
 * STIX 2.1 Bundle Serializer
 *
 * Creates valid STIX 2.1 bundles from IntelGraph entities with
 * full provenance tracking, TLP markings, and digital signatures.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StixBundleFactory = void 0;
exports.createBundle = createBundle;
exports.calculateBundleChecksum = calculateBundleChecksum;
exports.signBundle = signBundle;
exports.verifyBundleSignature = verifyBundleSignature;
exports.serializeBundleToJson = serializeBundleToJson;
exports.serializeBundleWithEnvelope = serializeBundleWithEnvelope;
exports.parseBundleFromJson = parseBundleFromJson;
exports.validateBundle = validateBundle;
exports.mergeBundles = mergeBundles;
exports.splitBundle = splitBundle;
exports.filterBundleByType = filterBundleByType;
exports.getReferencedIds = getReferencedIds;
const node_crypto_1 = require("node:crypto");
const types_js_1 = require("./types.js");
const entity_mapper_js_1 = require("./entity-mapper.js");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const bundleLogger = logger_js_1.default.child({ module: 'stix-bundle-serializer' });
class StixBundleFactory {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    /**
     * Export entities to a STIX 2.1 bundle
     */
    async exportBundle(entities, options, exportedBy) {
        const startTime = Date.now();
        bundleLogger.info({
            entityCount: entities.length,
            options: {
                tlpLevel: options.tlpLevel,
                includeRelationships: options.includeRelationships,
                includeExtensions: options.includeExtensions,
            },
        }, 'Starting STIX bundle export');
        // Create producer identity
        const producer = (0, entity_mapper_js_1.createProducerIdentity)(options.producerName || 'IntelGraph Platform', options.producerClass || 'system');
        // Get TLP marking
        const tlpLevel = options.tlpLevel || 'green';
        const tlpMarking = (0, entity_mapper_js_1.getTlpMarking)(tlpLevel);
        const tlpMarkingRef = (0, entity_mapper_js_1.getTlpMarkingRef)(tlpLevel);
        // Build mapping context
        const mappingContext = {
            producerRef: producer.id,
            tlpMarkingRef,
            labels: options.labels,
            includeExtensions: options.includeExtensions ?? true,
            investigationId: options.investigationId,
            caseId: options.caseId,
        };
        // Map entities to STIX objects
        const mappingResults = [];
        const entityIdToStixId = new Map();
        for (const entity of entities) {
            const result = (0, entity_mapper_js_1.mapEntityToStix)(entity, mappingContext);
            mappingResults.push(result);
            entityIdToStixId.set(entity.id, result.stixId);
        }
        // Collect all STIX objects
        const objects = [
            producer,
            tlpMarking,
        ];
        // Add IntelGraph extension definition if using extensions
        if (options.includeExtensions !== false) {
            objects.push(types_js_1.INTELGRAPH_EXTENSION_DEFINITION);
        }
        // Add mapped entities
        for (const result of mappingResults) {
            objects.push(result.stixObject);
        }
        // Fetch and add relationships if requested
        let relationshipCount = 0;
        if (options.includeRelationships !== false) {
            const relationships = await this.fetchRelationships(entities.map(e => e.id), entityIdToStixId, options.relationshipDepth || 1, mappingContext);
            objects.push(...relationships);
            relationshipCount = relationships.length;
        }
        // Create bundle
        const bundle = createBundle(objects);
        // Calculate checksum
        const checksum = calculateBundleChecksum(bundle);
        // Sign bundle if key provided
        let signature;
        let signatureAlgorithm;
        if (options.signingKey) {
            const sigResult = signBundle(bundle, options.signingKey);
            signature = sigResult.signature;
            signatureAlgorithm = sigResult.algorithm;
        }
        const duration = Date.now() - startTime;
        bundleLogger.info({
            bundleId: bundle.id,
            objectCount: objects.length,
            entityCount: entities.length,
            relationshipCount,
            duration,
        }, 'STIX bundle export completed');
        return {
            bundle,
            metadata: {
                exportedAt: new Date().toISOString(),
                exportedBy,
                entityCount: entities.length,
                relationshipCount,
                tlpLevel,
                signature,
                signatureAlgorithm,
                checksum,
            },
        };
    }
    /**
     * Fetch relationships between entities from Neo4j
     */
    async fetchRelationships(entityIds, entityIdToStixId, depth, ctx) {
        if (entityIds.length === 0)
            return [];
        const session = this.deps.neo4j.session();
        try {
            const result = await session.executeRead(async (tx) => {
                return tx.run(`
          MATCH (source:Entity)-[r]->(target:Entity)
          WHERE source.id IN $entityIds AND target.id IN $entityIds
          RETURN source.id AS sourceId,
                 target.id AS targetId,
                 type(r) AS relType,
                 r.description AS description,
                 r.startTime AS startTime,
                 r.stopTime AS stopTime,
                 r.confidence AS confidence
          `, { entityIds });
            });
            const relationships = [];
            for (const record of result.records) {
                const sourceId = record.get('sourceId');
                const targetId = record.get('targetId');
                const sourceStixId = entityIdToStixId.get(sourceId);
                const targetStixId = entityIdToStixId.get(targetId);
                if (sourceStixId && targetStixId) {
                    const input = {
                        sourceEntityId: sourceId,
                        sourceStixId,
                        targetEntityId: targetId,
                        targetStixId,
                        relationshipType: record.get('relType'),
                        description: record.get('description'),
                        startTime: record.get('startTime'),
                        stopTime: record.get('stopTime'),
                        confidence: record.get('confidence'),
                    };
                    relationships.push((0, entity_mapper_js_1.createRelationship)(input, ctx));
                }
            }
            return relationships;
        }
        finally {
            await session.close();
        }
    }
}
exports.StixBundleFactory = StixBundleFactory;
// ============================================================================
// Bundle Creation Utilities
// ============================================================================
/**
 * Create a STIX 2.1 bundle from objects
 */
function createBundle(objects) {
    return {
        type: 'bundle',
        id: `bundle--${(0, node_crypto_1.randomUUID)()}`,
        objects,
    };
}
/**
 * Calculate SHA-256 checksum of bundle
 */
function calculateBundleChecksum(bundle) {
    const content = JSON.stringify(bundle, Object.keys(bundle).sort());
    return (0, node_crypto_1.createHash)('sha256').update(content).digest('hex');
}
/**
 * Sign bundle with HMAC-SHA256
 */
function signBundle(bundle, signingKey) {
    const content = JSON.stringify(bundle, Object.keys(bundle).sort());
    const signature = (0, node_crypto_1.createHmac)('sha256', signingKey)
        .update(content)
        .digest('base64url');
    return {
        signature,
        algorithm: 'HMAC-SHA256',
    };
}
/**
 * Verify bundle signature
 */
function verifyBundleSignature(bundle, signature, signingKey) {
    const content = JSON.stringify(bundle, Object.keys(bundle).sort());
    const expectedSignature = (0, node_crypto_1.createHmac)('sha256', signingKey)
        .update(content)
        .digest('base64url');
    // Constant-time comparison
    if (signature.length !== expectedSignature.length)
        return false;
    let result = 0;
    for (let i = 0; i < signature.length; i++) {
        result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    return result === 0;
}
// ============================================================================
// Bundle Serialization Formats
// ============================================================================
/**
 * Serialize bundle to JSON string
 */
function serializeBundleToJson(bundle, pretty = true) {
    return JSON.stringify(bundle, null, pretty ? 2 : undefined);
}
/**
 * Serialize bundle with envelope (for TAXII)
 */
function serializeBundleWithEnvelope(bundle, metadata) {
    const envelope = {
        '@context': {
            stix: 'http://stix.mitre.org/stix-2',
            intelgraph: 'https://intelgraph.io/schema/',
        },
        metadata: {
            ...metadata,
            bundleId: bundle.id,
            objectCount: bundle.objects.length,
        },
        bundle,
    };
    return JSON.stringify(envelope, null, 2);
}
/**
 * Parse bundle from JSON string
 */
function parseBundleFromJson(json) {
    const parsed = JSON.parse(json);
    if (parsed.type !== 'bundle') {
        throw new Error('Invalid STIX bundle: missing or invalid type');
    }
    if (!parsed.id?.startsWith('bundle--')) {
        throw new Error('Invalid STIX bundle: missing or invalid id');
    }
    if (!Array.isArray(parsed.objects)) {
        throw new Error('Invalid STIX bundle: objects must be an array');
    }
    return parsed;
}
/**
 * Validate a STIX 2.1 bundle
 */
function validateBundle(bundle) {
    const errors = [];
    const warnings = [];
    const objectsByType = {};
    // Check bundle structure
    if (bundle.type !== 'bundle') {
        errors.push('Bundle type must be "bundle"');
    }
    if (!bundle.id?.match(/^bundle--[0-9a-f-]{36}$/i)) {
        errors.push('Bundle ID must be in format bundle--{uuid}');
    }
    if (!Array.isArray(bundle.objects)) {
        errors.push('Bundle objects must be an array');
        return {
            valid: false,
            errors,
            warnings,
            statistics: {
                totalObjects: 0,
                objectsByType: {},
                hasProducerIdentity: false,
                hasTlpMarking: false,
                hasExtensions: false,
            },
        };
    }
    // Track statistics
    let hasProducerIdentity = false;
    let hasTlpMarking = false;
    let hasExtensions = false;
    const seenIds = new Set();
    for (let i = 0; i < bundle.objects.length; i++) {
        const obj = bundle.objects[i];
        // Check for required properties
        if (!obj.type) {
            errors.push(`Object at index ${i} missing type`);
            continue;
        }
        if (!obj.id) {
            errors.push(`Object at index ${i} missing id`);
            continue;
        }
        // Check for duplicate IDs
        if (seenIds.has(obj.id)) {
            warnings.push(`Duplicate object ID: ${obj.id}`);
        }
        seenIds.add(obj.id);
        // Count by type
        objectsByType[obj.type] = (objectsByType[obj.type] || 0) + 1;
        // Check for producer identity
        if (obj.type === 'identity' && obj.identity_class) {
            hasProducerIdentity = true;
        }
        // Check for TLP marking
        if (obj.type === 'marking-definition') {
            hasTlpMarking = true;
        }
        // Check for extensions
        if (obj.type === 'extension-definition') {
            hasExtensions = true;
        }
        // Validate spec_version
        if ('spec_version' in obj && obj.spec_version !== '2.1') {
            warnings.push(`Object ${obj.id} has non-2.1 spec_version: ${obj.spec_version}`);
        }
        // Validate timestamps
        if ('created' in obj && obj.created) {
            if (!isValidTimestamp(obj.created)) {
                warnings.push(`Object ${obj.id} has invalid created timestamp`);
            }
        }
        if ('modified' in obj && obj.modified) {
            if (!isValidTimestamp(obj.modified)) {
                warnings.push(`Object ${obj.id} has invalid modified timestamp`);
            }
        }
    }
    // Best practice warnings
    if (!hasProducerIdentity) {
        warnings.push('Bundle does not contain a producer identity');
    }
    if (!hasTlpMarking) {
        warnings.push('Bundle does not contain TLP marking definitions');
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        statistics: {
            totalObjects: bundle.objects.length,
            objectsByType,
            hasProducerIdentity,
            hasTlpMarking,
            hasExtensions,
        },
    };
}
function isValidTimestamp(timestamp) {
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
}
// ============================================================================
// Bundle Merge Utilities
// ============================================================================
/**
 * Merge multiple STIX bundles into one
 */
function mergeBundles(bundles) {
    const seenIds = new Set();
    const mergedObjects = [];
    for (const bundle of bundles) {
        for (const obj of bundle.objects) {
            if (!seenIds.has(obj.id)) {
                seenIds.add(obj.id);
                mergedObjects.push(obj);
            }
        }
    }
    return createBundle(mergedObjects);
}
/**
 * Split a large bundle into smaller chunks
 */
function splitBundle(bundle, maxObjectsPerBundle) {
    const chunks = [];
    for (let i = 0; i < bundle.objects.length; i += maxObjectsPerBundle) {
        const chunkObjects = bundle.objects.slice(i, i + maxObjectsPerBundle);
        chunks.push(createBundle(chunkObjects));
    }
    return chunks;
}
/**
 * Filter bundle objects by type
 */
function filterBundleByType(bundle, types) {
    const filteredObjects = bundle.objects.filter(obj => types.includes(obj.type));
    return createBundle(filteredObjects);
}
/**
 * Extract object IDs referenced in relationships
 */
function getReferencedIds(bundle) {
    const ids = new Set();
    for (const obj of bundle.objects) {
        if (obj.type === 'relationship') {
            const rel = obj;
            ids.add(rel.source_ref);
            ids.add(rel.target_ref);
        }
    }
    return ids;
}
