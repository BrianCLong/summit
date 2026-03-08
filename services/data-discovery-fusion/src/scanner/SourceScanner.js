"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceScanner = void 0;
const uuid_1 = require("uuid");
const events_1 = require("events");
const logger_js_1 = require("../utils/logger.js");
/**
 * Automated Source Scanner
 * Continuously scans configured endpoints for new data sources
 */
class SourceScanner extends events_1.EventEmitter {
    config;
    discoveredSources = new Map();
    scanInterval = null;
    isScanning = false;
    constructor(config) {
        super();
        this.config = config;
    }
    /**
     * Start automated scanning
     */
    start() {
        if (this.scanInterval)
            return;
        logger_js_1.logger.info('Starting automated source scanner', {
            interval: this.config.scanInterval,
            endpoints: this.config.endpoints.length,
        });
        // Initial scan
        this.scan();
        // Schedule periodic scans
        this.scanInterval = setInterval(() => {
            this.scan();
        }, this.config.scanInterval);
    }
    /**
     * Stop automated scanning
     */
    stop() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        logger_js_1.logger.info('Source scanner stopped');
    }
    /**
     * Perform a full scan of all configured endpoints
     */
    async scan() {
        if (this.isScanning) {
            logger_js_1.logger.warn('Scan already in progress, skipping');
            return { sources: [], errors: [], duration: 0 };
        }
        this.isScanning = true;
        const startTime = Date.now();
        const results = [];
        const errors = [];
        try {
            for (const endpoint of this.config.endpoints) {
                try {
                    const sources = await this.scanEndpoint(endpoint);
                    results.push(...sources);
                }
                catch (error) {
                    errors.push({
                        endpoint: endpoint.uri,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
            // Process newly discovered sources
            for (const source of results) {
                const existing = this.discoveredSources.get(source.connectionUri);
                if (!existing) {
                    this.discoveredSources.set(source.connectionUri, source);
                    this.emitEvent('source_discovered', source);
                    // Auto-ingest if confidence meets threshold
                    if (source.confidenceScore >= this.config.autoIngestThreshold) {
                        source.autoIngestEnabled = true;
                        this.emit('auto_ingest', source);
                    }
                }
                else {
                    // Update last scanned timestamp
                    existing.lastScannedAt = new Date();
                }
            }
            return {
                sources: results,
                errors,
                duration: Date.now() - startTime,
            };
        }
        finally {
            this.isScanning = false;
        }
    }
    /**
     * Scan a specific endpoint based on its type
     */
    async scanEndpoint(endpoint) {
        switch (endpoint.type) {
            case 'database':
                return this.scanDatabase(endpoint);
            case 'api':
                return this.scanApi(endpoint);
            case 'file':
                return this.scanFileSystem(endpoint);
            case 's3':
                return this.scanS3(endpoint);
            case 'kafka':
                return this.scanKafka(endpoint);
            default:
                return [];
        }
    }
    /**
     * Scan database for tables/schemas
     */
    async scanDatabase(endpoint) {
        const sources = [];
        // Detect database type from URI
        const dbType = this.detectDatabaseType(endpoint.uri);
        try {
            // Query information_schema for available tables
            const tables = await this.queryDatabaseTables(endpoint);
            for (const table of tables) {
                sources.push({
                    id: (0, uuid_1.v4)(),
                    name: `${dbType}:${table.schema}.${table.name}`,
                    type: 'database',
                    connectionUri: `${endpoint.uri}/${table.schema}.${table.name}`,
                    status: 'discovered',
                    discoveredAt: new Date(),
                    confidenceScore: this.calculateSourceConfidence(table),
                    tags: [dbType, table.schema],
                    autoIngestEnabled: false,
                    metadata: {
                        schema: table.schema,
                        tableName: table.name,
                        estimatedRows: table.rowCount,
                        columns: table.columns,
                    },
                });
            }
        }
        catch (error) {
            logger_js_1.logger.error('Database scan failed', { endpoint: endpoint.uri, error });
        }
        return sources;
    }
    /**
     * Scan REST API endpoints for available resources
     */
    async scanApi(endpoint) {
        const sources = [];
        try {
            // Try to fetch OpenAPI/Swagger spec
            const specUrls = [
                `${endpoint.uri}/openapi.json`,
                `${endpoint.uri}/swagger.json`,
                `${endpoint.uri}/api-docs`,
            ];
            for (const specUrl of specUrls) {
                try {
                    const response = await fetch(specUrl);
                    if (response.ok) {
                        const spec = await response.json();
                        const endpoints = this.extractApiEndpoints(spec);
                        for (const ep of endpoints) {
                            sources.push({
                                id: (0, uuid_1.v4)(),
                                name: `API:${ep.path}`,
                                type: 'api',
                                connectionUri: `${endpoint.uri}${ep.path}`,
                                status: 'discovered',
                                discoveredAt: new Date(),
                                confidenceScore: 0.8,
                                tags: ['api', ep.method],
                                autoIngestEnabled: false,
                                metadata: {
                                    method: ep.method,
                                    parameters: ep.parameters,
                                    responseSchema: ep.responseSchema,
                                },
                            });
                        }
                        break;
                    }
                }
                catch {
                    // Continue to next spec URL
                }
            }
        }
        catch (error) {
            logger_js_1.logger.error('API scan failed', { endpoint: endpoint.uri, error });
        }
        return sources;
    }
    /**
     * Scan filesystem for data files
     */
    async scanFileSystem(endpoint) {
        const sources = [];
        const pattern = endpoint.scanPattern || '**/*.{csv,json,parquet,xlsx}';
        // In production, use glob to find matching files
        // For now, return placeholder
        logger_js_1.logger.info('Scanning filesystem', { path: endpoint.uri, pattern });
        return sources;
    }
    /**
     * Scan S3 bucket for data objects
     */
    async scanS3(endpoint) {
        const sources = [];
        // Parse S3 URI
        const match = endpoint.uri.match(/s3:\/\/([^/]+)(\/.*)?/);
        if (!match)
            return sources;
        const bucket = match[1];
        const prefix = match[2] || '/';
        logger_js_1.logger.info('Scanning S3 bucket', { bucket, prefix });
        // In production, use AWS SDK to list objects
        // Return discovered data sources
        return sources;
    }
    /**
     * Scan Kafka for available topics
     */
    async scanKafka(endpoint) {
        const sources = [];
        logger_js_1.logger.info('Scanning Kafka', { brokers: endpoint.uri });
        // In production, use Kafka admin client to list topics
        // Return discovered topics as sources
        return sources;
    }
    /**
     * Helper methods
     */
    detectDatabaseType(uri) {
        if (uri.startsWith('postgresql://') || uri.startsWith('postgres://'))
            return 'postgresql';
        if (uri.startsWith('mysql://'))
            return 'mysql';
        if (uri.startsWith('mongodb://'))
            return 'mongodb';
        if (uri.startsWith('neo4j://') || uri.startsWith('bolt://'))
            return 'neo4j';
        return 'unknown';
    }
    async queryDatabaseTables(endpoint) {
        // Placeholder - implement actual database queries
        return [];
    }
    extractApiEndpoints(spec) {
        // Extract endpoints from OpenAPI spec
        const endpoints = [];
        if (spec && typeof spec === 'object' && 'paths' in spec) {
            const paths = spec.paths;
            for (const [path, methods] of Object.entries(paths)) {
                if (methods && typeof methods === 'object') {
                    for (const [method, def] of Object.entries(methods)) {
                        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
                            endpoints.push({
                                path,
                                method: method.toUpperCase(),
                                parameters: [],
                                responseSchema: null,
                            });
                        }
                    }
                }
            }
        }
        return endpoints;
    }
    calculateSourceConfidence(table) {
        // Calculate confidence based on source characteristics
        let confidence = 0.5;
        // Higher confidence for tables with data
        if (table.rowCount > 0)
            confidence += 0.2;
        if (table.rowCount > 1000)
            confidence += 0.1;
        // Lower confidence for system schemas
        if (['pg_catalog', 'information_schema', 'sys'].includes(table.schema)) {
            confidence -= 0.3;
        }
        return Math.max(0, Math.min(1, confidence));
    }
    emitEvent(type, payload) {
        const event = {
            type,
            payload,
            timestamp: new Date(),
            correlationId: (0, uuid_1.v4)(),
        };
        this.emit('event', event);
    }
    /**
     * Get all discovered sources
     */
    getDiscoveredSources() {
        return Array.from(this.discoveredSources.values());
    }
    /**
     * Get source by ID
     */
    getSource(id) {
        return Array.from(this.discoveredSources.values()).find(s => s.id === id);
    }
    /**
     * Add endpoint for scanning
     */
    addEndpoint(endpoint) {
        this.config.endpoints.push(endpoint);
        logger_js_1.logger.info('Added scan endpoint', { type: endpoint.type, uri: endpoint.uri });
    }
}
exports.SourceScanner = SourceScanner;
