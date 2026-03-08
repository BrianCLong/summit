"use strict";
// @ts-nocheck
/**
 * TAXII 2.1 Service Implementation
 *
 * Provides a TAXII 2.1 compliant server for sharing STIX bundles
 * with external systems and partners.
 *
 * @see https://docs.oasis-open.org/cti/taxii/v2.1/taxii-v2.1.html
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxiiService = void 0;
exports.createTaxiiService = createTaxiiService;
const node_crypto_1 = require("node:crypto");
const bundle_serializer_js_1 = require("./bundle-serializer.js");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const taxiiLogger = logger_js_1.default.child({ module: 'taxii-service' });
// ============================================================================
// TAXII Service
// ============================================================================
class TaxiiService {
    deps;
    config;
    collections = new Map();
    objectStore = new Map();
    pendingStatuses = new Map();
    bundleFactory = null;
    constructor(config, deps) {
        this.deps = deps;
        this.config = {
            baseUrl: config.baseUrl,
            title: config.title,
            description: config.description || 'IntelGraph TAXII 2.1 Server',
            contact: config.contact || 'security@intelgraph.io',
            apiRootPath: config.apiRootPath || '/taxii2/api',
            maxContentLength: config.maxContentLength || 10_485_760, // 10MB
            defaultPageSize: config.defaultPageSize || 100,
            maxPageSize: config.maxPageSize || 1000,
        };
        this.bundleFactory = new bundle_serializer_js_1.StixBundleFactory(deps);
        // Initialize with default collection
        this.registerCollection({
            id: 'default',
            title: 'IntelGraph Intelligence Feed',
            description: 'Default collection for IntelGraph threat intelligence sharing.',
            alias: 'intel-feed',
            canRead: true,
            canWrite: true,
        });
        taxiiLogger.info({
            baseUrl: this.config.baseUrl,
            title: this.config.title,
        }, 'TAXII service initialized');
    }
    // ==========================================================================
    // Collection Management
    // ==========================================================================
    /**
     * Register a new collection
     */
    registerCollection(collection) {
        this.collections.set(collection.id, collection);
        this.objectStore.set(collection.id, new Map());
        taxiiLogger.info({ collectionId: collection.id, title: collection.title }, 'Collection registered');
    }
    /**
     * Get collection by ID
     */
    getCollection(collectionId) {
        return this.collections.get(collectionId);
    }
    /**
     * List all collections (filtered by access)
     */
    listCollections(canRead, canWrite) {
        let collections = Array.from(this.collections.values());
        if (canRead !== undefined) {
            collections = collections.filter(c => c.canRead === canRead);
        }
        if (canWrite !== undefined) {
            collections = collections.filter(c => c.canWrite === canWrite);
        }
        return collections;
    }
    // ==========================================================================
    // TAXII Discovery Endpoints
    // ==========================================================================
    /**
     * Generate discovery document
     */
    getDiscoveryDocument() {
        return {
            title: this.config.title,
            description: this.config.description,
            contact: this.config.contact,
            default: `${this.config.baseUrl}${this.config.apiRootPath}/`,
            api_roots: [`${this.config.baseUrl}${this.config.apiRootPath}/`],
        };
    }
    /**
     * Generate API root information
     */
    getApiRootInfo() {
        return {
            title: `${this.config.title} API Root`,
            description: `Primary API root for ${this.config.title}`,
            versions: ['2.1'],
            max_content_length: this.config.maxContentLength,
        };
    }
    /**
     * Get collection metadata
     */
    getCollectionMetadata(collectionId) {
        const collection = this.collections.get(collectionId);
        if (!collection)
            return null;
        return {
            id: collection.id,
            title: collection.title,
            description: collection.description,
            alias: collection.alias,
            can_read: collection.canRead,
            can_write: collection.canWrite,
            media_types: collection.mediaTypes || [
                'application/stix+json;version=2.1',
                'application/taxii+json;version=2.1',
            ],
        };
    }
    /**
     * List all collection metadata
     */
    listCollectionMetadata() {
        return Array.from(this.collections.values()).map(c => ({
            id: c.id,
            title: c.title,
            description: c.description,
            alias: c.alias,
            can_read: c.canRead,
            can_write: c.canWrite,
            media_types: c.mediaTypes || [
                'application/stix+json;version=2.1',
                'application/taxii+json;version=2.1',
            ],
        }));
    }
    // ==========================================================================
    // Object Storage & Retrieval
    // ==========================================================================
    /**
     * Get objects from a collection
     */
    getObjects(collectionId, options = {}) {
        const store = this.objectStore.get(collectionId);
        if (!store) {
            throw new Error(`Collection not found: ${collectionId}`);
        }
        let objects = Array.from(store.values());
        // Apply filters
        if (options.addedAfter) {
            const afterDate = new Date(options.addedAfter);
            objects = objects.filter(o => new Date(o.dateAdded) > afterDate);
        }
        if (options.type?.length) {
            objects = objects.filter(o => options.type.includes(o.object.type));
        }
        if (options.id?.length) {
            objects = objects.filter(o => options.id.includes(o.object.id));
        }
        if (options.match) {
            for (const [key, value] of Object.entries(options.match)) {
                objects = objects.filter(o => {
                    const obj = o.object;
                    return String(obj[key]) === value;
                });
            }
        }
        // Sort by date added (newest first)
        objects.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        // Pagination
        const limit = Math.min(options.limit || this.config.defaultPageSize, this.config.maxPageSize);
        let startIndex = 0;
        if (options.next) {
            const cursor = decodeCursor(options.next);
            startIndex = cursor.offset;
        }
        const pageObjects = objects.slice(startIndex, startIndex + limit);
        const hasMore = startIndex + limit < objects.length;
        return {
            more: hasMore,
            next: hasMore ? encodeCursor({ offset: startIndex + limit }) : undefined,
            objects: pageObjects.map(o => o.object),
        };
    }
    /**
     * Get object manifest
     */
    getManifest(collectionId, options = {}) {
        const store = this.objectStore.get(collectionId);
        if (!store) {
            throw new Error(`Collection not found: ${collectionId}`);
        }
        let objects = Array.from(store.values());
        // Apply same filters as getObjects
        if (options.addedAfter) {
            const afterDate = new Date(options.addedAfter);
            objects = objects.filter(o => new Date(o.dateAdded) > afterDate);
        }
        if (options.type?.length) {
            objects = objects.filter(o => options.type.includes(o.object.type));
        }
        if (options.id?.length) {
            objects = objects.filter(o => options.id.includes(o.object.id));
        }
        // Pagination
        const limit = Math.min(options.limit || this.config.defaultPageSize, this.config.maxPageSize);
        let startIndex = 0;
        if (options.next) {
            const cursor = decodeCursor(options.next);
            startIndex = cursor.offset;
        }
        const pageObjects = objects.slice(startIndex, startIndex + limit);
        return {
            objects: pageObjects.map(o => ({
                id: o.object.id,
                date_added: o.dateAdded,
                version: o.version,
                media_type: 'application/stix+json;version=2.1',
            })),
        };
    }
    /**
     * Get a specific object by ID
     */
    getObject(collectionId, objectId, version) {
        const store = this.objectStore.get(collectionId);
        if (!store)
            return null;
        const stored = store.get(objectId);
        if (!stored)
            return null;
        if (version && stored.version !== version) {
            return null;
        }
        return {
            objects: [stored.object],
        };
    }
    /**
     * Add objects to a collection
     */
    addObjects(collectionId, bundle, userId) {
        const collection = this.collections.get(collectionId);
        if (!collection) {
            throw new Error(`Collection not found: ${collectionId}`);
        }
        if (!collection.canWrite) {
            throw new Error(`Collection ${collectionId} does not allow writing`);
        }
        const store = this.objectStore.get(collectionId);
        const statusId = (0, node_crypto_1.randomUUID)();
        const timestamp = new Date().toISOString();
        // Validate bundle
        const validation = (0, bundle_serializer_js_1.validateBundle)(bundle);
        if (!validation.valid) {
            const status = {
                id: statusId,
                status: 'failure',
                request_timestamp: timestamp,
                total_count: bundle.objects.length,
                success_count: 0,
                failure_count: bundle.objects.length,
                pending_count: 0,
                failures: bundle.objects.map(obj => ({
                    id: obj.id,
                    message: validation.errors.join('; '),
                })),
            };
            this.pendingStatuses.set(statusId, status);
            return status;
        }
        const successes = [];
        const failures = [];
        for (const object of bundle.objects) {
            try {
                const stored = {
                    object,
                    dateAdded: timestamp,
                    version: object.modified || timestamp,
                    addedBy: userId,
                };
                store.set(object.id, stored);
                successes.push(object.id);
            }
            catch (error) {
                failures.push({
                    id: object.id,
                    message: error.message,
                });
            }
        }
        const status = {
            id: statusId,
            status: failures.length === 0 ? 'complete' : 'failure',
            request_timestamp: timestamp,
            total_count: bundle.objects.length,
            success_count: successes.length,
            failure_count: failures.length,
            pending_count: 0,
            successes: successes.length > 0 ? successes : undefined,
            failures: failures.length > 0 ? failures : undefined,
        };
        this.pendingStatuses.set(statusId, status);
        taxiiLogger.info({
            collectionId,
            statusId,
            successCount: successes.length,
            failureCount: failures.length,
            userId,
        }, 'Objects added to collection');
        return status;
    }
    /**
     * Get status of an add operation
     */
    getStatus(statusId) {
        return this.pendingStatuses.get(statusId) || null;
    }
    /**
     * Delete an object from a collection
     */
    deleteObject(collectionId, objectId, userId) {
        const collection = this.collections.get(collectionId);
        if (!collection) {
            throw new Error(`Collection not found: ${collectionId}`);
        }
        if (!collection.canWrite) {
            throw new Error(`Collection ${collectionId} does not allow writing`);
        }
        const store = this.objectStore.get(collectionId);
        const deleted = store.delete(objectId);
        if (deleted) {
            taxiiLogger.info({ collectionId, objectId, userId }, 'Object deleted from collection');
        }
        return deleted;
    }
    // ==========================================================================
    // IntelGraph Integration
    // ==========================================================================
    /**
     * Sync entities from IntelGraph to TAXII collection
     */
    async syncFromIntelGraph(collectionId, options) {
        const collection = this.collections.get(collectionId);
        if (!collection) {
            throw new Error(`Collection not found: ${collectionId}`);
        }
        // Query entities from database
        const entities = await this.queryEntities(options);
        if (entities.length === 0) {
            return {
                id: (0, node_crypto_1.randomUUID)(),
                status: 'complete',
                request_timestamp: new Date().toISOString(),
                total_count: 0,
                success_count: 0,
                failure_count: 0,
                pending_count: 0,
            };
        }
        // Export to STIX bundle
        const result = await this.bundleFactory.exportBundle(entities, {
            entityIds: entities.map(e => e.id),
            includeRelationships: true,
            includeExtensions: true,
            tlpLevel: 'green',
        }, options.userId);
        // Add to collection
        return this.addObjects(collectionId, result.bundle, options.userId);
    }
    /**
     * Query entities from PostgreSQL
     */
    async queryEntities(options) {
        const params = [options.tenantId];
        let query = 'SELECT * FROM entities WHERE tenant_id = $1';
        let paramIndex = 2;
        if (options.entityIds?.length) {
            query += ` AND id = ANY($${paramIndex})`;
            params.push(options.entityIds);
            paramIndex++;
        }
        if (options.entityKinds?.length) {
            query += ` AND kind = ANY($${paramIndex})`;
            params.push(options.entityKinds);
            paramIndex++;
        }
        if (options.since) {
            query += ` AND updated_at >= $${paramIndex}`;
            params.push(options.since);
            paramIndex++;
        }
        query += ' ORDER BY updated_at DESC LIMIT 1000';
        const result = await this.deps.pg.query(query, params);
        return result.rows.map((row) => ({
            id: row.id,
            tenantId: row.tenant_id,
            kind: row.kind,
            labels: row.labels,
            props: row.props,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
        }));
    }
}
exports.TaxiiService = TaxiiService;
// ============================================================================
// Utility Functions
// ============================================================================
function encodeCursor(cursor) {
    return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}
function decodeCursor(encoded) {
    try {
        return JSON.parse(Buffer.from(encoded, 'base64url').toString());
    }
    catch {
        return { offset: 0 };
    }
}
// ============================================================================
// Factory
// ============================================================================
function createTaxiiService(config, deps) {
    return new TaxiiService({
        baseUrl: config.baseUrl || process.env.TAXII_BASE_URL || 'http://localhost:4000',
        title: config.title || process.env.TAXII_TITLE || 'IntelGraph TAXII Server',
        description: config.description,
        contact: config.contact,
        apiRootPath: config.apiRootPath,
        maxContentLength: config.maxContentLength,
        defaultPageSize: config.defaultPageSize,
        maxPageSize: config.maxPageSize,
    }, deps);
}
