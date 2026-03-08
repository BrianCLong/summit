"use strict";
/**
 * Ingestion Hooks for PII Detection
 *
 * Provides middleware to inject PII detection and sensitivity tagging
 * into connector and ETL pipeline flows.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionHook = void 0;
exports.createIngestionHook = createIngestionHook;
exports.withPIIDetection = withPIIDetection;
const recognizer_js_1 = require("./recognizer.js");
const taxonomy_js_1 = require("./taxonomy.js");
const sensitivity_js_1 = require("./sensitivity.js");
const DataCatalogService_js_1 = require("../data-governance/catalog/DataCatalogService.js");
/**
 * Ingestion hook for PII detection and tagging
 */
class IngestionHook {
    recognizer;
    taxonomyManager;
    sensitivityClassifier;
    config;
    catalogCache;
    constructor(config) {
        this.config = config;
        this.recognizer = new recognizer_js_1.HybridEntityRecognizer();
        this.taxonomyManager = new taxonomy_js_1.TaxonomyManager();
        this.sensitivityClassifier = new sensitivity_js_1.SensitivityClassifier();
        this.catalogCache = new Map();
    }
    /**
     * Process a single record during ingestion
     */
    async processRecord(record) {
        if (!this.config.enabled) {
            return {
                detected: false,
                entities: [],
                blocked: false,
            };
        }
        const allEntities = [];
        // Flatten and detect PII in all fields
        const flattenedFields = this.flattenRecord(record.data, record.schema);
        for (const field of flattenedFields) {
            const result = await this.recognizer.recognize({
                value: String(field.value),
                schemaField: field.schemaField,
                schema: record.schema,
                recordId: record.id,
                tableName: record.tableName,
            }, {
                ...this.config.recognitionOptions,
                minimumConfidence: this.config.minimumConfidence || 0.7,
            });
            // Classify entities using taxonomy
            for (const entity of result.entities) {
                const classification = this.taxonomyManager.classify(entity.type);
                if (classification) {
                    const classified = {
                        ...entity,
                        severity: classification.node.severity,
                        taxonomy: classification.taxonomy,
                        categories: classification.node.categories || [],
                        policyTags: classification.node.policyTags || [],
                    };
                    allEntities.push(classified);
                }
            }
        }
        // Check if any high-severity or critical PII was detected
        const highSeverityEntities = allEntities.filter(e => e.severity === 'high' || e.severity === 'critical');
        let blocked = false;
        let blockReason;
        if (this.config.strictMode && highSeverityEntities.length > 0) {
            blocked = true;
            blockReason = `High-severity PII detected: ${highSeverityEntities
                .map(e => e.type)
                .join(', ')}. Manual approval required.`;
            // Trigger callback
            if (this.config.onHighSeverityDetected) {
                await this.config.onHighSeverityDetected(highSeverityEntities);
            }
        }
        // Generate sensitivity metadata
        let sensitivityMetadata;
        if (allEntities.length > 0) {
            const piiTypes = [...new Set(allEntities.map(e => e.type))];
            const maxSeverity = this.getMaxSeverity(allEntities);
            const policyTags = [...new Set(allEntities.flatMap(e => e.policyTags))];
            sensitivityMetadata = this.sensitivityClassifier.classify(piiTypes, maxSeverity, policyTags);
        }
        // Auto-tag catalog
        let catalogId;
        if (this.config.autoTagCatalog && record.tableName) {
            try {
                const urn = `urn:${record.source}:${record.tableName}`;
                let assetId;
                let currentTags = [];
                // Check cache first
                if (this.catalogCache.has(urn)) {
                    const cached = this.catalogCache.get(urn);
                    assetId = cached.id;
                    currentTags = cached.tags;
                }
                else {
                    const catalog = DataCatalogService_js_1.DataCatalogService.getInstance();
                    // Try to find existing asset
                    let asset = await catalog.getAssetByUrn(urn);
                    if (!asset && record.metadata?.tenantId) {
                        // Register new asset
                        asset = await catalog.registerAsset({
                            urn,
                            name: record.tableName,
                            type: 'table', // Defaulting to table
                            source: record.source,
                            schema: { fields: [] }, // Populate if we have schema metadata
                            owners: [],
                            tags: [],
                            sensitivity: sensitivityMetadata?.level || 'internal',
                            metadata: {},
                            tenantId: record.metadata.tenantId
                        });
                    }
                    if (asset) {
                        assetId = asset.id;
                        currentTags = asset.tags;
                        this.catalogCache.set(urn, { id: assetId, tags: currentTags });
                    }
                }
                if (assetId) {
                    catalogId = assetId;
                    // Update tags if PII detected
                    if (sensitivityMetadata) {
                        const newTags = [...currentTags];
                        let changed = false;
                        if (!newTags.includes('PII')) {
                            newTags.push('PII');
                            changed = true;
                        }
                        if (!newTags.includes(sensitivityMetadata.level)) {
                            newTags.push(sensitivityMetadata.level);
                            changed = true;
                        }
                        if (changed) {
                            const catalog = DataCatalogService_js_1.DataCatalogService.getInstance();
                            // Avoid duplicates
                            const uniqueTags = [...new Set(newTags)];
                            await catalog.updateAsset(assetId, {
                                tags: uniqueTags,
                                sensitivity: sensitivityMetadata.level
                            });
                            // Update cache
                            this.catalogCache.set(urn, { id: assetId, tags: uniqueTags });
                        }
                    }
                }
            }
            catch (err) {
                // Non-blocking error logging for catalog integration
                console.error('Failed to auto-tag catalog:', err);
            }
        }
        return {
            detected: allEntities.length > 0,
            entities: allEntities,
            blocked,
            blockReason,
            sensitivityMetadata,
            catalogId
        };
    }
    /**
     * Process a batch of records
     */
    async processBatch(records) {
        const results = [];
        for (const record of records) {
            const result = await this.processRecord(record);
            results.push(result);
        }
        return results;
    }
    /**
     * Flatten nested record structure for scanning
     */
    flattenRecord(data, schema, path = []) {
        const results = [];
        for (const [key, value] of Object.entries(data)) {
            const currentPath = [...path, key];
            const schemaField = schema?.fields.find(f => f.fieldName === key);
            if (value === null || value === undefined) {
                continue;
            }
            if (typeof value === 'object' && !Array.isArray(value)) {
                // Recurse into nested objects
                results.push(...this.flattenRecord(value, schema, currentPath));
            }
            else if (Array.isArray(value)) {
                // Process array elements
                value.forEach((item, index) => {
                    if (typeof item === 'object') {
                        results.push(...this.flattenRecord(item, schema, [...currentPath, String(index)]));
                    }
                    else {
                        results.push({
                            value: item,
                            schemaField,
                            path: [...currentPath, String(index)],
                        });
                    }
                });
            }
            else {
                // Leaf value - add to results
                results.push({
                    value,
                    schemaField,
                    path: currentPath,
                });
            }
        }
        return results;
    }
    /**
     * Get maximum severity from list of entities
     */
    getMaxSeverity(entities) {
        const severityOrder = ['low', 'medium', 'high', 'critical'];
        const maxIndex = entities.reduce((max, entity) => {
            const index = severityOrder.indexOf(entity.severity);
            return index > max ? index : max;
        }, 0);
        return severityOrder[maxIndex];
    }
}
exports.IngestionHook = IngestionHook;
/**
 * Factory function to create ingestion hook
 */
function createIngestionHook(config) {
    return new IngestionHook(config);
}
/**
 * Connector middleware wrapper
 *
 * Wraps a connector's fetch/ingest method to inject PII detection
 */
function withPIIDetection(connector, hook, options) {
    return new Proxy(connector, {
        get(target, prop, receiver) {
            const original = Reflect.get(target, prop, receiver);
            // Intercept methods that ingest data
            if (typeof original === 'function' &&
                (prop === 'fetch' || prop === 'ingest' || prop === 'process' || prop === 'load')) {
                return async function (...args) {
                    // Call original method
                    const result = await original.apply(target, args);
                    // Process result through PII detection
                    if (result && typeof result === 'object') {
                        // Assume result has records array
                        const records = Array.isArray(result) ? result : result.records || [];
                        for (const record of records) {
                            if (record && typeof record === 'object' && record.id) {
                                const detectionResult = await hook.processRecord({
                                    id: record.id,
                                    data: record,
                                    source: target.constructor.name,
                                });
                                if (detectionResult.detected && options?.onDetection) {
                                    options.onDetection(detectionResult);
                                }
                                if (detectionResult.blocked && options?.onBlocked) {
                                    options.onBlocked(detectionResult);
                                    throw new Error(detectionResult.blockReason);
                                }
                            }
                        }
                    }
                    return result;
                };
            }
            return original;
        },
    });
}
