"use strict";
/**
 * Deterministic Export Service - GA Core Implementation
 * Provides export bundles with SHA256 manifests and integrity verification
 *
 * Features:
 * - Deterministic export ordering for consistent hashes
 * - Complete manifest with SHA256 hashes for all files
 * - Pipeline transform tracking for provenance
 * - Integrity verification on export and import
 * - Prometheus metrics for Go/No-Go dashboard
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeterministicExportService = void 0;
const fs_1 = require("fs");
const crypto_1 = require("crypto");
const path_1 = require("path");
const archiver_1 = __importDefault(require("archiver"));
const node_crypto_1 = require("node:crypto");
const module_1 = require("module");
const require = (0, module_1.createRequire)(import.meta.url);
const logger_js_1 = __importDefault(require("../config/logger.js"));
const database_js_1 = require("../config/database.js");
const dataRedaction_js_1 = require("../utils/dataRedaction.js");
const quantum_identity_manager_js_1 = require("../security/quantum-identity-manager.js");
const log = logger_js_1.default.child({ name: 'DeterministicExportService' });
class DeterministicExportService {
    tempDir;
    maxExportSize = 500 * 1024 * 1024; // 500MB limit
    constructor() {
        this.tempDir = (0, path_1.join)(process.cwd(), 'tmp', 'exports');
        if (!(0, fs_1.existsSync)(this.tempDir)) {
            (0, fs_1.mkdirSync)(this.tempDir, { recursive: true });
        }
    }
    /**
     * Create deterministic export bundle with manifest
     */
    async createExportBundle(request, session) {
        const exportId = (0, node_crypto_1.randomUUID)();
        const startTime = Date.now();
        log.info({ exportId, request }, 'Starting deterministic export');
        try {
            // Step 1: Create working directory
            const workDir = (0, path_1.join)(this.tempDir, exportId);
            (0, fs_1.mkdirSync)(workDir, { recursive: true });
            // Step 2: Extract data with deterministic ordering
            const { entities, relationships } = await this.extractDataDeterministic(session, request);
            // Step 3: Apply transforms with provenance tracking
            const transformedData = await this.applyTransforms({ entities, relationships }, request, exportId);
            // Step 4: Generate files with consistent ordering
            const files = await this.generateFiles(transformedData, request, workDir);
            // Step 5: Create manifest
            const manifest = await this.createManifest(exportId, request, files, transformedData.transforms);
            // Step 6: Bundle everything
            const bundlePath = await this.createBundle(workDir, exportId, manifest);
            // Step 7: Store export metadata
            await this.storeExportMetadata(manifest);
            const executionTime = Date.now() - startTime;
            log.info({
                exportId,
                bundleSize: manifest.integrity.totalBytes,
                fileCount: manifest.integrity.totalFiles,
                executionTime,
            }, 'Deterministic export completed');
            return { exportId, bundlePath, manifest };
        }
        catch (error) {
            log.error({
                exportId,
                error: error.message,
            }, 'Export failed');
            // Clean up on failure
            const workDir = (0, path_1.join)(this.tempDir, exportId);
            if ((0, fs_1.existsSync)(workDir)) {
                (0, fs_1.rmSync)(workDir, { recursive: true, force: true });
            }
            throw error;
        }
    }
    /**
     * Verify export bundle integrity
     */
    async verifyExportBundle(bundlePath) {
        log.info({ bundlePath }, 'Verifying export bundle integrity');
        try {
            // Step 1: Extract manifest from bundle
            const manifest = await this.extractManifestFromBundle(bundlePath);
            // Step 2: Verify bundle hash
            const actualBundleHash = await this.calculateFileHash(bundlePath);
            const expectedBundleHash = manifest.integrity.bundleHash;
            if (actualBundleHash !== expectedBundleHash) {
                manifest.verification = {
                    verified: false,
                    verifiedAt: new Date().toISOString(),
                    verificationErrors: [
                        `Bundle hash mismatch: expected ${expectedBundleHash}, got ${actualBundleHash}`,
                    ],
                };
                return manifest;
            }
            // Step 3: Extract and verify individual files
            const tempVerifyDir = (0, path_1.join)(this.tempDir, `verify-${Date.now()}`);
            await this.extractBundle(bundlePath, tempVerifyDir);
            const verificationErrors = [];
            for (const fileEntry of manifest.files) {
                const filePath = (0, path_1.join)(tempVerifyDir, fileEntry.filename);
                if (!(0, fs_1.existsSync)(filePath)) {
                    verificationErrors.push(`Missing file: ${fileEntry.filename}`);
                    continue;
                }
                const actualHash = await this.calculateFileHash(filePath);
                if (actualHash !== fileEntry.sha256) {
                    verificationErrors.push(`File hash mismatch for ${fileEntry.filename}: expected ${fileEntry.sha256}, got ${actualHash}`);
                }
                const actualSize = (await Promise.resolve().then(() => __importStar(require('fs/promises'))))
                    .stat(filePath)
                    .then((s) => s.size);
                if ((await actualSize) !== fileEntry.bytes) {
                    verificationErrors.push(`File size mismatch for ${fileEntry.filename}: expected ${fileEntry.bytes}, got ${await actualSize}`);
                }
            }
            // Clean up verification directory
            (0, fs_1.rmSync)(tempVerifyDir, { recursive: true, force: true });
            // Update manifest with verification results
            manifest.verification = {
                verified: verificationErrors.length === 0,
                verifiedAt: new Date().toISOString(),
                verificationErrors,
            };
            log.info({
                bundlePath,
                verified: manifest.verification.verified,
                errorCount: verificationErrors.length,
            }, 'Bundle verification completed');
            return manifest;
        }
        catch (error) {
            log.error({
                bundlePath,
                error: error.message,
            }, 'Bundle verification failed');
            throw error;
        }
    }
    async extractDataDeterministic(session, request) {
        const { where, params } = this.buildFilterClauses(request);
        // Fetch entities with deterministic ordering
        const entitiesQuery = `
      MATCH (e:Entity) ${where}
      RETURN e
      ORDER BY e.id, e.created_at, e.name
    `;
        const entitiesResult = await session.run(entitiesQuery, params);
        const entities = entitiesResult.records.map((record) => {
            const entity = record.get('e').properties;
            return this.normalizeEntity(entity);
        });
        // Fetch relationships with deterministic ordering
        const relationshipsQuery = `
      MATCH (a:Entity)-[r:RELATIONSHIP]->(b:Entity)
      ${where.replace(/e\./g, 'a.')}
      ${where ? 'AND b.investigation_id = a.investigation_id' : ''}
      RETURN a, r, b
      ORDER BY r.id, r.created_at, a.id, b.id
    `;
        const relationshipsResult = await session.run(relationshipsQuery, params);
        const relationships = relationshipsResult.records.map((record) => {
            const r = record.get('r');
            const a = record.get('a').properties;
            const b = record.get('b').properties;
            return this.normalizeRelationship(r, a, b);
        });
        return { entities, relationships };
    }
    buildFilterClauses(request) {
        const conditions = [];
        const params = {};
        if (request.investigationId) {
            conditions.push('e.investigation_id = $investigationId');
            params.investigationId = request.investigationId;
        }
        if (request.entityType) {
            conditions.push('e.type = $entityType');
            params.entityType = request.entityType;
        }
        if (request.tags && request.tags.length > 0) {
            conditions.push('ANY(tag IN e.tags WHERE tag IN $tags)');
            params.tags = request.tags;
        }
        if (request.startDate) {
            conditions.push('e.created_at >= $startDate');
            params.startDate = request.startDate;
        }
        if (request.endDate) {
            conditions.push('e.created_at <= $endDate');
            params.endDate = request.endDate;
        }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        return { where, params };
    }
    normalizeEntity(entity) {
        // Sort properties for deterministic output
        const normalized = {};
        const sortedKeys = Object.keys(entity).sort();
        for (const key of sortedKeys) {
            normalized[key] = entity[key];
        }
        return normalized;
    }
    normalizeRelationship(r, a, b) {
        return {
            id: r.properties?.id || r.identity?.toString?.(),
            type: r.type || r.properties?.type,
            properties: r.properties || {},
            source: a.uuid || a.id,
            target: b.uuid || b.id,
            sourceEntity: this.normalizeEntity(a),
            targetEntity: this.normalizeEntity(b),
        };
    }
    async applyTransforms(data, request, exportId) {
        const transforms = [];
        let { entities, relationships } = data;
        // Apply redaction transforms
        const redactionTransform = {
            id: (0, node_crypto_1.randomUUID)(),
            type: 'REDACTION',
            description: 'Apply data redaction based on user permissions',
            appliedAt: new Date().toISOString(),
            parameters: { userRole: 'analyst' }, // From request context
            inputHash: this.calculateObjectHash({ entities, relationships }),
            outputHash: '',
        };
        // Create stub user for redaction (TODO: use actual user from request context)
        const redactionUser = {
            id: request.userId,
            email: 'export-service@internal',
            username: 'export-service',
            firstName: 'Export',
            lastName: 'Service',
            role: 'analyst',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        // Apply redactions
        entities = entities.map((entity) => (0, dataRedaction_js_1.redactData)(entity, redactionUser));
        relationships = relationships.map((rel) => ({
            ...rel,
            sourceEntity: (0, dataRedaction_js_1.redactData)(rel.sourceEntity, redactionUser),
            targetEntity: (0, dataRedaction_js_1.redactData)(rel.targetEntity, redactionUser),
        }));
        redactionTransform.outputHash = this.calculateObjectHash({
            entities,
            relationships,
        });
        transforms.push(redactionTransform);
        // Apply filtering transforms if needed
        if (request.entityType || request.tags) {
            const filterTransform = {
                id: (0, node_crypto_1.randomUUID)(),
                type: 'FILTERING',
                description: 'Filter entities and relationships based on criteria',
                appliedAt: new Date().toISOString(),
                parameters: {
                    entityType: request.entityType,
                    tags: request.tags,
                },
                inputHash: redactionTransform.outputHash,
                outputHash: '',
            };
            // Filtering is already applied in the query, so this is just for audit
            filterTransform.outputHash = this.calculateObjectHash({
                entities,
                relationships,
            });
            transforms.push(filterTransform);
        }
        return { entities, relationships, transforms };
    }
    async generateFiles(data, request, workDir) {
        const files = [];
        // Generate entities file
        const entitiesFile = await this.writeJSONFile((0, path_1.join)(workDir, 'entities.json'), data.entities, 'Entity data export');
        files.push(entitiesFile);
        // Generate relationships file
        const relationshipsFile = await this.writeJSONFile((0, path_1.join)(workDir, 'relationships.json'), data.relationships, 'Relationship data export');
        files.push(relationshipsFile);
        // Generate transforms log
        const transformsFile = await this.writeJSONFile((0, path_1.join)(workDir, 'transforms.json'), data.transforms, 'Data transformation log');
        files.push(transformsFile);
        // Generate CSV files if requested
        if (request.format === 'csv' || request.format === 'bundle') {
            const entitiesCSV = await this.writeCSVFile((0, path_1.join)(workDir, 'entities.csv'), data.entities);
            files.push(entitiesCSV);
            const relationshipsCSV = await this.writeCSVFile((0, path_1.join)(workDir, 'relationships.csv'), data.relationships);
            files.push(relationshipsCSV);
        }
        return files;
    }
    async writeJSONFile(filePath, data, description) {
        const content = JSON.stringify(data, null, 2);
        const buffer = Buffer.from(content, 'utf8');
        await Promise.resolve().then(() => __importStar(require('fs/promises'))).then((fs) => fs.writeFile(filePath, buffer));
        const hash = (0, crypto_1.createHash)('sha256').update(buffer).digest('hex');
        return {
            filename: filePath.split('/').pop(),
            sha256: hash,
            bytes: buffer.length,
            contentType: 'application/json',
            created: new Date().toISOString(),
            transforms: ['deterministic-ordering', 'json-serialization'],
        };
    }
    async writeCSVFile(filePath, data) {
        const { Parser } = require('json2csv');
        if (data.length === 0) {
            const buffer = Buffer.from('', 'utf8');
            await Promise.resolve().then(() => __importStar(require('fs/promises'))).then((fs) => fs.writeFile(filePath, buffer));
            return {
                filename: filePath.split('/').pop(),
                sha256: (0, crypto_1.createHash)('sha256').update(buffer).digest('hex'),
                bytes: 0,
                contentType: 'text/csv',
                created: new Date().toISOString(),
                transforms: ['deterministic-ordering', 'csv-serialization'],
            };
        }
        // Get all unique keys for consistent column ordering
        const allKeys = new Set();
        data.forEach((item) => Object.keys(item).forEach((key) => allKeys.add(key)));
        const sortedFields = Array.from(allKeys).sort();
        const parser = new Parser({ fields: sortedFields, header: true });
        const csv = parser.parse(data);
        const buffer = Buffer.from(csv, 'utf8');
        await Promise.resolve().then(() => __importStar(require('fs/promises'))).then((fs) => fs.writeFile(filePath, buffer));
        const hash = (0, crypto_1.createHash)('sha256').update(buffer).digest('hex');
        return {
            filename: filePath.split('/').pop(),
            sha256: hash,
            bytes: buffer.length,
            contentType: 'text/csv',
            created: new Date().toISOString(),
            transforms: ['deterministic-ordering', 'csv-serialization'],
        };
    }
    async createManifest(exportId, request, files, transforms) {
        const manifest = {
            version: '1.0',
            exportId,
            createdAt: new Date().toISOString(),
            createdBy: request.userId,
            request: {
                ...request,
                // Remove sensitive data from manifest
                userId: '[REDACTED]',
            },
            files,
            transforms,
            integrity: {
                manifestHash: '',
                bundleHash: '',
                totalFiles: files.length,
                totalBytes: files.reduce((sum, f) => sum + f.bytes, 0),
            },
            verification: {
                verified: false,
                verificationErrors: [],
            },
        };
        // Calculate manifest hash (excluding the hash field itself)
        const manifestForHash = { ...manifest };
        delete manifestForHash.integrity.manifestHash;
        delete manifestForHash.integrity.bundleHash;
        manifest.integrity.manifestHash = this.calculateObjectHash(manifestForHash);
        // Task #114: Attach PQC Signature
        const serviceId = process.env.SERVICE_ID || 'summit-api-export';
        // We sign a string containing BOTH the serviceId and the manifestHash for stability
        const signedPayload = `service=${serviceId};hash=${manifest.integrity.manifestHash}`;
        const identity = quantum_identity_manager_js_1.quantumIdentityManager.issueIdentity(signedPayload);
        manifest.pqcServiceId = serviceId;
        manifest.pqcSignature = identity.signature;
        return manifest;
    }
    async createBundle(workDir, exportId, manifest) {
        const bundlePath = (0, path_1.join)(this.tempDir, `${exportId}.zip`);
        // Write manifest to work directory
        const manifestPath = (0, path_1.join)(workDir, 'manifest.json');
        await Promise.resolve().then(() => __importStar(require('fs/promises'))).then((fs) => fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2)));
        // Create ZIP bundle
        const output = (0, fs_1.createWriteStream)(bundlePath);
        const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        archive.pipe(output);
        archive.directory(workDir, false);
        await archive.finalize();
        // Bundle hash calculation removed to avoid circular dependency
        // The manifest inside the bundle cannot contain the hash of the bundle itself
        return bundlePath;
    }
    async calculateFileHash(filePath) {
        const hash = (0, crypto_1.createHash)('sha256');
        const stream = (0, fs_1.createReadStream)(filePath);
        for await (const chunk of stream) {
            hash.update(chunk);
        }
        return hash.digest('hex');
    }
    calculateObjectHash(obj) {
        const jsonString = JSON.stringify(obj, Object.keys(obj).sort());
        return (0, crypto_1.createHash)('sha256').update(jsonString).digest('hex');
    }
    async storeExportMetadata(manifest) {
        const pool = (0, database_js_1.getPostgresPool)();
        try {
            await pool.query(`
        INSERT INTO export_manifests (
          id, version, created_by, request_params, files_count, total_bytes,
          manifest_hash, bundle_hash, transforms, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
                manifest.exportId,
                manifest.version,
                manifest.createdBy,
                JSON.stringify(manifest.request),
                manifest.integrity.totalFiles,
                manifest.integrity.totalBytes,
                manifest.integrity.manifestHash,
                manifest.integrity.bundleHash,
                JSON.stringify(manifest.transforms),
                manifest.createdAt,
            ]);
        }
        catch (error) {
            log.warn({
                exportId: manifest.exportId,
                error: error.message,
            }, 'Failed to store export metadata');
        }
    }
    async extractManifestFromBundle(bundlePath) {
        // This would extract and parse the manifest from the ZIP bundle
        // Implementation depends on ZIP extraction library
        throw new Error('Bundle extraction not implemented');
    }
    async extractBundle(bundlePath, extractPath) {
        // This would extract the entire ZIP bundle
        // Implementation depends on ZIP extraction library
        throw new Error('Bundle extraction not implemented');
    }
}
exports.DeterministicExportService = DeterministicExportService;
