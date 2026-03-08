"use strict";
// @ts-nocheck
/**
 * Sync Service - Air-Gapped Data Synchronization
 *
 * Handles export/import of data bundles between core and edge deployments
 * with cryptographic verification and conflict resolution.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const pg_1 = require("pg");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const index_js_1 = require("./types/index.js");
const bundle_exporter_js_1 = require("./exporters/bundle-exporter.js");
const bundle_importer_js_1 = require("./importers/bundle-importer.js");
const signer_js_1 = require("./crypto/signer.js");
const PORT = parseInt(process.env.PORT || '4020');
const NODE_ENV = process.env.NODE_ENV || 'development';
// Configuration
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID || 'default';
const DEPLOYMENT_NAME = process.env.DEPLOYMENT_NAME || 'default';
const DEPLOYMENT_ENV = (process.env.DEPLOYMENT_ENV || 'edge');
const CLASSIFICATION = process.env.CLASSIFICATION || 'UNCLASSIFIED';
// Paths
const BUNDLE_STORAGE_PATH = process.env.BUNDLE_STORAGE_PATH || '/opt/intelgraph/bundles';
const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH || '/opt/intelgraph/keys/private.pem';
const PUBLIC_KEY_PATH = process.env.PUBLIC_KEY_PATH || '/opt/intelgraph/keys/public.pem';
// Database connection
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL ||
        'postgres://postgres:postgres@localhost:5432/intelgraph',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
// Initialize crypto signer
let signer;
async function initializeSigner() {
    try {
        // Try to load keys from files
        const privateKey = await promises_1.default.readFile(PRIVATE_KEY_PATH, 'utf-8').catch(() => null);
        const publicKey = await promises_1.default.readFile(PUBLIC_KEY_PATH, 'utf-8').catch(() => null);
        if (privateKey && publicKey) {
            signer = new signer_js_1.BundleSigner({ privateKey, publicKey });
            console.log('Loaded signing keys from files');
        }
        else {
            // Generate temporary keys for development
            console.warn('No signing keys found - generating temporary keys (NOT FOR PRODUCTION)');
            const keyPair = signer_js_1.BundleSigner.generateKeyPair();
            signer = new signer_js_1.BundleSigner(keyPair);
            // Save keys for future use (in development)
            if (NODE_ENV === 'development') {
                await promises_1.default.mkdir(node_path_1.default.dirname(PRIVATE_KEY_PATH), { recursive: true });
                await promises_1.default.writeFile(PRIVATE_KEY_PATH, keyPair.privateKey);
                await promises_1.default.writeFile(PUBLIC_KEY_PATH, keyPair.publicKey);
                console.log('Saved generated keys to:', node_path_1.default.dirname(PRIVATE_KEY_PATH));
            }
        }
    }
    catch (error) {
        console.error('Failed to initialize signer:', error);
        throw error;
    }
}
// Initialize exporters and importers
const exporterConfig = {
    pgPool: pool,
    signer,
    deploymentId: DEPLOYMENT_ID,
    deploymentName: DEPLOYMENT_NAME,
    environment: DEPLOYMENT_ENV,
    classification: CLASSIFICATION,
};
const importerConfig = {
    pgPool: pool,
    signer,
    deploymentId: DEPLOYMENT_ID,
    deploymentName: DEPLOYMENT_NAME,
    environment: DEPLOYMENT_ENV,
    classification: CLASSIFICATION,
};
let exporter;
let importer;
// Create Fastify instance
const server = (0, fastify_1.default)({
    logger: {
        level: NODE_ENV === 'development' ? 'debug' : 'info',
        ...(NODE_ENV === 'development'
            ? { transport: { target: 'pino-pretty' } }
            : {}),
    },
});
// Register plugins
server.register(helmet_1.default);
server.register(cors_1.default, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
});
// ============================================================================
// Health Check
// ============================================================================
server.get('/health', async (request, reply) => {
    try {
        // Test database connection
        await pool.query('SELECT 1');
        // Check bundle storage
        const bundleStorageExists = await promises_1.default
            .access(BUNDLE_STORAGE_PATH)
            .then(() => true)
            .catch(() => false);
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            deployment: {
                id: DEPLOYMENT_ID,
                name: DEPLOYMENT_NAME,
                environment: DEPLOYMENT_ENV,
                classification: CLASSIFICATION,
            },
            dependencies: {
                database: 'healthy',
                bundleStorage: bundleStorageExists ? 'healthy' : 'warning',
            },
        };
    }
    catch (error) {
        reply.status(503);
        return {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            dependencies: {
                database: 'unhealthy',
            },
        };
    }
});
// ============================================================================
// Export Endpoints
// ============================================================================
server.post('/export', {
    schema: {
        body: index_js_1.ExportRequestSchema,
    },
}, async (request, reply) => {
    try {
        server.log.info({
            requester: request.body.requester,
            direction: request.body.direction,
            scope: request.body.scope,
        }, 'Export request received');
        const result = await exporter.exportBundle(request.body);
        // Save bundle to storage if not dry run
        if (!request.body.dryRun && result.success) {
            const bundlePath = node_path_1.default.join(BUNDLE_STORAGE_PATH, `${result.bundleId}.json`);
            await promises_1.default.mkdir(BUNDLE_STORAGE_PATH, { recursive: true });
            const bundle = {
                manifest: result.manifest,
                content: {}, // Content would be included here
                checksums: result.checksums,
                signatures: result.signatures,
            };
            await promises_1.default.writeFile(bundlePath, JSON.stringify(bundle, null, 2));
            result.bundlePath = bundlePath;
        }
        if (result.success) {
            return result;
        }
        else {
            reply.status(400);
            return result;
        }
    }
    catch (error) {
        server.log.error(error, 'Export failed');
        reply.status(500);
        return {
            success: false,
            error: 'Export failed',
            message: error.message,
        };
    }
});
// ============================================================================
// Import Endpoints
// ============================================================================
server.post('/import', {
    schema: {
        body: index_js_1.ImportRequestSchema,
    },
}, async (request, reply) => {
    try {
        server.log.info({
            requester: request.body.requester,
            conflictResolution: request.body.conflictResolution,
            dryRun: request.body.dryRun,
        }, 'Import request received');
        // Load bundle if path provided
        let bundleData = request.body.bundleData;
        if (request.body.bundlePath && !bundleData) {
            const bundleContent = await promises_1.default.readFile(request.body.bundlePath, 'utf-8');
            bundleData = index_js_1.SyncBundleSchema.parse(JSON.parse(bundleContent));
        }
        if (!bundleData) {
            reply.status(400);
            return {
                success: false,
                error: 'Either bundlePath or bundleData must be provided',
            };
        }
        const result = await importer.importBundle({
            ...request.body,
            bundleData,
        });
        if (result.success) {
            return result;
        }
        else {
            reply.status(400);
            return result;
        }
    }
    catch (error) {
        server.log.error(error, 'Import failed');
        reply.status(500);
        return {
            success: false,
            error: 'Import failed',
            message: error.message,
        };
    }
});
// ============================================================================
// Verification Endpoints
// ============================================================================
server.post('/verify', async (request, reply) => {
    try {
        // Load bundle
        let bundleData = request.body.bundleData;
        if (request.body.bundlePath && !bundleData) {
            const bundleContent = await promises_1.default.readFile(request.body.bundlePath, 'utf-8');
            bundleData = index_js_1.SyncBundleSchema.parse(JSON.parse(bundleContent));
        }
        if (!bundleData) {
            reply.status(400);
            return {
                valid: false,
                error: 'Either bundlePath or bundleData must be provided',
            };
        }
        const result = await signer.verifyBundle(bundleData);
        return {
            valid: result.valid,
            checksumValid: result.checksumValid,
            signaturesValid: result.signaturesValid,
            notExpired: result.notExpired,
            validSignatureCount: result.validSignatureCount,
            errors: result.errors,
        };
    }
    catch (error) {
        server.log.error(error, 'Verification failed');
        reply.status(500);
        return {
            valid: false,
            error: 'Verification failed',
            message: error.message,
        };
    }
});
// ============================================================================
// List Bundles
// ============================================================================
server.get('/bundles', async (request, reply) => {
    try {
        const files = await promises_1.default.readdir(BUNDLE_STORAGE_PATH).catch(() => []);
        const bundles = [];
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const bundlePath = node_path_1.default.join(BUNDLE_STORAGE_PATH, file);
                    const content = await promises_1.default.readFile(bundlePath, 'utf-8');
                    const bundle = JSON.parse(content);
                    bundles.push({
                        bundleId: bundle.manifest.id,
                        direction: bundle.manifest.direction,
                        createdAt: bundle.manifest.createdAt,
                        expiresAt: bundle.manifest.expiresAt,
                        createdBy: bundle.manifest.createdBy,
                        sourceDeployment: bundle.manifest.sourceDeployment.name,
                        path: bundlePath,
                    });
                }
                catch (error) {
                    server.log.warn({ file }, 'Failed to parse bundle file');
                }
            }
        }
        return {
            bundles: bundles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
            total: bundles.length,
        };
    }
    catch (error) {
        server.log.error(error, 'Failed to list bundles');
        reply.status(500);
        return {
            error: 'Failed to list bundles',
            message: error.message,
        };
    }
});
// ============================================================================
// Get Bundle Details
// ============================================================================
server.get('/bundles/:bundleId', async (request, reply) => {
    try {
        const bundlePath = node_path_1.default.join(BUNDLE_STORAGE_PATH, `${request.params.bundleId}.json`);
        const content = await promises_1.default.readFile(bundlePath, 'utf-8');
        const bundle = JSON.parse(content);
        return bundle;
    }
    catch (error) {
        server.log.error(error, 'Failed to retrieve bundle');
        reply.status(404);
        return {
            error: 'Bundle not found',
            bundleId: request.params.bundleId,
        };
    }
});
// ============================================================================
// Audit Log Endpoints
// ============================================================================
server.get('/audit-log', async (request, reply) => {
    try {
        const result = await pool.query(`SELECT bundle_id, operation, actor, source_deployment, target_deployment,
              result, timestamp, classification
       FROM sync_audit_log
       ORDER BY timestamp DESC
       LIMIT 100`);
        return {
            records: result.rows,
            total: result.rowCount,
        };
    }
    catch (error) {
        server.log.error(error, 'Failed to retrieve audit log');
        reply.status(500);
        return {
            error: 'Failed to retrieve audit log',
            message: error.message,
        };
    }
});
// ============================================================================
// Conflict Management Endpoints
// ============================================================================
server.get('/conflicts', async (request, reply) => {
    try {
        const result = await pool.query(`SELECT id, bundle_id, type, resource_type, resource_id,
              detected_at, resolved_at, resolution, resolved_by
       FROM sync_conflicts
       WHERE resolved_at IS NULL
       ORDER BY detected_at DESC`);
        return {
            conflicts: result.rows,
            total: result.rowCount,
        };
    }
    catch (error) {
        server.log.error(error, 'Failed to retrieve conflicts');
        reply.status(500);
        return {
            error: 'Failed to retrieve conflicts',
            message: error.message,
        };
    }
});
// ============================================================================
// Start Server
// ============================================================================
const start = async () => {
    try {
        // Initialize crypto signer
        await initializeSigner();
        // Initialize exporters and importers
        exporter = new bundle_exporter_js_1.BundleExporter({
            ...exporterConfig,
            signer,
        });
        importer = new bundle_importer_js_1.BundleImporter({
            ...importerConfig,
            signer,
        });
        // Ensure bundle storage directory exists
        await promises_1.default.mkdir(BUNDLE_STORAGE_PATH, { recursive: true });
        // Start server
        await server.listen({ port: PORT, host: '0.0.0.0' });
        server.log.info(`🔄 Sync service ready at http://localhost:${PORT}`);
        server.log.info(`📦 Deployment: ${DEPLOYMENT_NAME} (${DEPLOYMENT_ENV})`);
        server.log.info(`🔒 Classification: ${CLASSIFICATION}`);
        server.log.info(`💾 Bundle storage: ${BUNDLE_STORAGE_PATH}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
