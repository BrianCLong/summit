#!/usr/bin/env ts-node
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const crypto_1 = require("crypto");
const child_process_1 = require("child_process");
const tar = __importStar(require("tar"));
const api_1 = require("@opentelemetry/api");
const pg_1 = require("../../server/src/db/pg");
const neo4j_1 = require("../../server/src/db/neo4j");
const tracer = api_1.trace.getTracer('export-tool', '24.3.0');
class ExportTool {
    exportId;
    workDir;
    manifest;
    constructor() {
        this.exportId = `export-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        this.workDir = `/tmp/${this.exportId}`;
    }
    async exportTenantData(options) {
        return tracer.startActiveSpan('export.tenant_data', async (span) => {
            span.setAttributes({
                export_id: this.exportId,
                tenant_id: options.tenantId,
                purpose: options.purpose,
                include_postgres: options.includePostgres,
                include_neo4j: options.includeNeo4j,
            });
            try {
                console.log(`🚀 Starting export for tenant ${options.tenantId}`);
                console.log(`Export ID: ${this.exportId}`);
                // Create working directory
                await (0, promises_1.mkdir)(this.workDir, { recursive: true });
                // Initialize manifest
                await this.initializeManifest(options);
                // Export data sources
                if (options.includePostgres) {
                    await this.exportPostgreSQL(options);
                }
                if (options.includeNeo4j) {
                    await this.exportNeo4j(options);
                }
                if (options.includeMetadata) {
                    await this.exportMetadata(options);
                }
                // Generate checksums
                await this.generateChecksums();
                // Create final bundle
                const bundlePath = await this.createBundle(options);
                // Sign with cosign if requested
                if (options.sign && options.cosignKey) {
                    await this.signBundle(bundlePath, options.cosignKey);
                }
                // Create attestation
                await this.createAttestation(bundlePath, options);
                console.log(`✅ Export completed: ${bundlePath}`);
                return bundlePath;
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async initializeManifest(options) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + options.expirationDays * 24 * 60 * 60 * 1000);
        this.manifest = {
            version: '24.3.0',
            exportId: this.exportId,
            tenantId: options.tenantId,
            region: process.env.CURRENT_REGION || 'us-east-1',
            purpose: options.purpose,
            requestedBy: options.requestedBy,
            exportedBy: `maestro-exporter-${process.env.CURRENT_REGION}`,
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            dataClassifications: options.dataClassifications || [],
            provenance: [],
            files: [],
            checksums: {},
        };
        // Add initial provenance entry
        this.manifest.provenance.push({
            timestamp: now.toISOString(),
            action: 'export_initiated',
            actor: options.requestedBy,
            region: this.manifest.region,
            purpose: options.purpose,
            dataTypes: this.getDataTypes(options),
        });
    }
    async exportPostgreSQL(options) {
        return tracer.startActiveSpan('export.postgresql', async (span) => {
            console.log('📊 Exporting PostgreSQL data...');
            const filename = `postgresql-${this.exportId}.sql`;
            const filepath = (0, path_1.join)(this.workDir, filename);
            try {
                // Export tenant-specific data using pg_dump with custom queries
                const exportQuery = this.buildPostgreSQLExportQuery(options.tenantId);
                // Use pg_dump with custom query
                await this.runCommand('pg_dump', [
                    process.env.DATABASE_URL,
                    '--no-owner',
                    '--no-privileges',
                    '--data-only',
                    '--inserts',
                    `--file=${filepath}`,
                    `--where=tenant_id='${options.tenantId}'`,
                ]);
                // Get file stats
                const stats = await this.getFileStats(filepath);
                this.manifest.files.push({
                    filename,
                    type: 'postgresql',
                    size: stats.size,
                    checksum: stats.checksum,
                    compressed: false,
                });
                // Add provenance entry
                this.manifest.provenance.push({
                    timestamp: new Date().toISOString(),
                    action: 'postgresql_exported',
                    actor: 'exporter',
                    region: this.manifest.region,
                    purpose: options.purpose,
                    dataTypes: ['audit_logs', 'coherence_scores', 'user_sessions'],
                });
                span.setAttributes({
                    file_size: stats.size,
                    file_checksum: stats.checksum,
                });
                console.log(`✅ PostgreSQL export completed: ${stats.size} bytes`);
            }
            catch (error) {
                span.recordException(error);
                throw new Error(`PostgreSQL export failed: ${error.message}`);
            }
            finally {
                span.end();
            }
        });
    }
    async exportNeo4j(options) {
        return tracer.startActiveSpan('export.neo4j', async (span) => {
            console.log('🕸️ Exporting Neo4j data...');
            const filename = `neo4j-${this.exportId}.cypher`;
            const filepath = (0, path_1.join)(this.workDir, filename);
            try {
                // Export tenant-specific nodes and relationships
                const cypherQueries = [
                    `MATCH (n) WHERE n.tenant_id = '${options.tenantId}' RETURN n`,
                    `MATCH (n)-[r]->(m) WHERE n.tenant_id = '${options.tenantId}' AND m.tenant_id = '${options.tenantId}' RETURN n, r, m`,
                ];
                let exportData = '';
                for (const query of cypherQueries) {
                    const result = await neo4j_1.neo.run(query, {}, { tenantId: options.tenantId });
                    // Convert result to Cypher CREATE statements
                    exportData += this.convertNeo4jResultToCypher(result);
                }
                await (0, promises_1.writeFile)(filepath, exportData, 'utf8');
                // Get file stats
                const stats = await this.getFileStats(filepath);
                this.manifest.files.push({
                    filename,
                    type: 'neo4j',
                    size: stats.size,
                    checksum: stats.checksum,
                    compressed: false,
                });
                // Add provenance entry
                this.manifest.provenance.push({
                    timestamp: new Date().toISOString(),
                    action: 'neo4j_exported',
                    actor: 'exporter',
                    region: this.manifest.region,
                    purpose: options.purpose,
                    dataTypes: ['signals', 'entities', 'relationships'],
                });
                span.setAttributes({
                    file_size: stats.size,
                    file_checksum: stats.checksum,
                });
                console.log(`✅ Neo4j export completed: ${stats.size} bytes`);
            }
            catch (error) {
                span.recordException(error);
                throw new Error(`Neo4j export failed: ${error.message}`);
            }
            finally {
                span.end();
            }
        });
    }
    async exportMetadata(options) {
        return tracer.startActiveSpan('export.metadata', async (span) => {
            console.log('📋 Exporting metadata...');
            const filename = `metadata-${this.exportId}.json`;
            const filepath = (0, path_1.join)(this.workDir, filename);
            try {
                // Gather tenant metadata
                const metadata = {
                    tenant: await this.getTenantInfo(options.tenantId),
                    schema: await this.getSchemaInfo(),
                    statistics: await this.getDataStatistics(options.tenantId),
                    exportInfo: {
                        exportId: this.exportId,
                        purpose: options.purpose,
                        requestedBy: options.requestedBy,
                        region: this.manifest.region,
                        timestamp: new Date().toISOString(),
                    },
                };
                await (0, promises_1.writeFile)(filepath, JSON.stringify(metadata, null, 2), 'utf8');
                // Get file stats
                const stats = await this.getFileStats(filepath);
                this.manifest.files.push({
                    filename,
                    type: 'metadata',
                    size: stats.size,
                    checksum: stats.checksum,
                    compressed: false,
                });
                span.setAttributes({
                    file_size: stats.size,
                    file_checksum: stats.checksum,
                });
                console.log(`✅ Metadata export completed: ${stats.size} bytes`);
            }
            catch (error) {
                span.recordException(error);
                throw new Error(`Metadata export failed: ${error.message}`);
            }
            finally {
                span.end();
            }
        });
    }
    async generateChecksums() {
        console.log('🔐 Generating checksums...');
        for (const file of this.manifest.files) {
            const filepath = (0, path_1.join)(this.workDir, file.filename);
            const checksum = await this.calculateFileChecksum(filepath);
            this.manifest.checksums[file.filename] = checksum;
            file.checksum = checksum;
        }
    }
    async createBundle(options) {
        return tracer.startActiveSpan('export.create_bundle', async (span) => {
            console.log('📦 Creating export bundle...');
            // Write manifest to file
            const manifestPath = (0, path_1.join)(this.workDir, 'manifest.json');
            await (0, promises_1.writeFile)(manifestPath, JSON.stringify(this.manifest, null, 2), 'utf8');
            // Create tar bundle
            const bundleName = `${this.exportId}-${options.tenantId}.tar.gz`;
            const bundlePath = (0, path_1.join)(options.outputDir, bundleName);
            // Ensure output directory exists
            await (0, promises_1.mkdir)((0, path_1.dirname)(bundlePath), { recursive: true });
            // Create compressed tar
            await tar.create({
                gzip: true,
                file: bundlePath,
                cwd: this.workDir,
            }, ['manifest.json', ...this.manifest.files.map((f) => f.filename)]);
            span.setAttributes({
                bundle_path: bundlePath,
                bundle_size: (await this.getFileStats(bundlePath)).size,
            });
            console.log(`✅ Bundle created: ${bundlePath}`);
            return bundlePath;
        });
    }
    async signBundle(bundlePath, cosignKey) {
        return tracer.startActiveSpan('export.sign_bundle', async (span) => {
            console.log('🔏 Signing bundle with cosign...');
            try {
                // Sign with cosign
                await this.runCommand('cosign', [
                    'sign-blob',
                    '--key',
                    cosignKey,
                    '--output-signature',
                    `${bundlePath}.sig`,
                    bundlePath,
                ]);
                // Update manifest with signature info
                this.manifest.signature = `${bundlePath}.sig`;
                span.setAttributes({
                    signed: true,
                    signature_file: `${bundlePath}.sig`,
                });
                console.log(`✅ Bundle signed: ${bundlePath}.sig`);
            }
            catch (error) {
                span.recordException(error);
                throw new Error(`Bundle signing failed: ${error.message}`);
            }
            finally {
                span.end();
            }
        });
    }
    async createAttestation(bundlePath, options) {
        return tracer.startActiveSpan('export.create_attestation', async (span) => {
            console.log('📜 Creating attestation...');
            const attestation = {
                _type: 'https://in-toto.io/Statement/v0.1',
                subject: [
                    {
                        name: bundlePath,
                        digest: {
                            sha256: await this.calculateFileChecksum(bundlePath),
                        },
                    },
                ],
                predicateType: 'https://maestro.dev/attestation/export/v1',
                predicate: {
                    exportManifest: this.manifest,
                    buildDefinition: {
                        buildType: 'https://maestro.dev/export/v1',
                        externalParameters: {
                            tenantId: options.tenantId,
                            purpose: options.purpose,
                            requestedBy: options.requestedBy,
                        },
                        internalParameters: {
                            exportId: this.exportId,
                            region: this.manifest.region,
                            version: '24.3.0',
                        },
                        resolvedDependencies: this.manifest.files.map((f) => ({
                            uri: f.filename,
                            digest: { sha256: f.checksum },
                            mediaType: this.getMediaType(f.type),
                        })),
                    },
                    runDetails: {
                        builder: {
                            id: `maestro-exporter-${this.manifest.region}`,
                            version: '24.3.0',
                        },
                        metadata: {
                            invocationId: this.exportId,
                            startedOn: this.manifest.createdAt,
                            finishedOn: new Date().toISOString(),
                        },
                    },
                },
            };
            const attestationPath = `${bundlePath}.att`;
            await (0, promises_1.writeFile)(attestationPath, JSON.stringify(attestation, null, 2), 'utf8');
            this.manifest.attestation = attestationPath;
            span.setAttributes({
                attestation_file: attestationPath,
                predicate_type: attestation.predicateType,
            });
            console.log(`✅ Attestation created: ${attestationPath}`);
        });
    }
    // Helper methods
    buildPostgreSQLExportQuery(tenantId) {
        return `
      SELECT * FROM audit_logs WHERE tenant_id = '${tenantId}'
      UNION ALL
      SELECT * FROM coherence_scores WHERE tenant_id = '${tenantId}'
      UNION ALL
      SELECT * FROM user_sessions WHERE tenant_id = '${tenantId}';
    `;
    }
    convertNeo4jResultToCypher(result) {
        let cypher = '';
        for (const record of result.records) {
            const keys = record.keys;
            for (const key of keys) {
                const value = record.get(key);
                if (value.labels) {
                    // Node
                    cypher += `CREATE (${key}:${value.labels.join(':')} ${JSON.stringify(value.properties)})\n`;
                }
                else if (value.type) {
                    // Relationship
                    cypher += `// Relationship: ${value.type}\n`;
                }
            }
        }
        return cypher;
    }
    async getTenantInfo(tenantId) {
        return await pg_1.pg.oneOrNone('SELECT tenant_id, region_tag, residency_region, residency_class, created_at FROM tenants WHERE tenant_id = $1', [tenantId], { tenantId });
    }
    async getSchemaInfo() {
        const pgSchema = await pg_1.pg.many('SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = $1', ['public']);
        return { postgresql: pgSchema };
    }
    async getDataStatistics(tenantId) {
        const stats = {
            postgresql: {},
            neo4j: {},
        };
        // PostgreSQL stats
        const tables = ['audit_logs', 'coherence_scores', 'user_sessions'];
        for (const table of tables) {
            const result = await pg_1.pg.oneOrNone(`SELECT COUNT(*) as count FROM ${table} WHERE tenant_id = $1`, [tenantId], { tenantId });
            stats.postgresql[table] = parseInt(result?.count || '0');
        }
        // Neo4j stats
        const nodeResult = await neo4j_1.neo.run('MATCH (n) WHERE n.tenant_id = $tenantId RETURN count(n) as count', { tenantId }, { tenantId });
        stats.neo4j.nodes = nodeResult.records[0]?.get('count')?.toNumber() || 0;
        return stats;
    }
    getDataTypes(options) {
        const types = [];
        if (options.includePostgres)
            types.push('postgresql');
        if (options.includeNeo4j)
            types.push('neo4j');
        if (options.includeMetadata)
            types.push('metadata');
        return types;
    }
    getMediaType(type) {
        switch (type) {
            case 'postgresql':
                return 'application/sql';
            case 'neo4j':
                return 'application/x-cypher-query';
            case 'metadata':
                return 'application/json';
            default:
                return 'application/octet-stream';
        }
    }
    async getFileStats(filepath) {
        const stats = await Promise.resolve().then(() => __importStar(require('fs'))).then((fs) => fs.promises.stat(filepath));
        const checksum = await this.calculateFileChecksum(filepath);
        return { size: stats.size, checksum };
    }
    async calculateFileChecksum(filepath) {
        return new Promise((resolve, reject) => {
            const hash = (0, crypto_1.createHash)('sha256');
            const stream = (0, fs_1.createReadStream)(filepath);
            stream.on('data', (chunk) => hash.update(chunk));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }
    async runCommand(command, args) {
        return new Promise((resolve, reject) => {
            const child = (0, child_process_1.spawn)(command, args, { stdio: 'inherit' });
            child.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`Command failed with exit code ${code}`));
                }
            });
            child.on('error', reject);
        });
    }
}
// CLI Interface
const program = new commander_1.Command();
program
    .name('maestro-export')
    .description('Maestro Conductor v24.3.0 - Tenant Data Export Tool')
    .version('24.3.0');
program
    .command('export')
    .description('Export tenant data with signed attestation')
    .requiredOption('-t, --tenant-id <tenantId>', 'Tenant ID to export')
    .requiredOption('-p, --purpose <purpose>', 'Purpose of export (legal_compliance, data_migration, analytics, backup)')
    .requiredOption('-r, --requested-by <email>', 'Email of person requesting export')
    .requiredOption('-o, --output-dir <dir>', 'Output directory for export bundle')
    .option('--include-postgres', 'Include PostgreSQL data', true)
    .option('--include-neo4j', 'Include Neo4j data', true)
    .option('--include-metadata', 'Include metadata', true)
    .option('--compress', 'Compress export bundle', true)
    .option('--encrypt', 'Encrypt export bundle', false)
    .option('--sign', 'Sign export bundle with cosign', true)
    .option('--cosign-key <path>', 'Path to cosign private key')
    .option('--expiration-days <days>', 'Days until export expires', '30')
    .option('--data-classifications <classifications>', 'Comma-separated data classifications')
    .action(async (options) => {
    try {
        const exportTool = new ExportTool();
        const exportOptions = {
            tenantId: options.tenantId,
            purpose: options.purpose,
            requestedBy: options.requestedBy,
            outputDir: options.outputDir,
            includePostgres: options.includePostgres,
            includeNeo4j: options.includeNeo4j,
            includeMetadata: options.includeMetadata,
            compress: options.compress,
            encrypt: options.encrypt,
            sign: options.sign,
            cosignKey: options.cosignKey,
            expirationDays: parseInt(options.expirationDays),
            dataClassifications: options.dataClassifications?.split(','),
        };
        const bundlePath = await exportTool.exportTenantData(exportOptions);
        console.log(`\n🎉 Export completed successfully!`);
        console.log(`Bundle: ${bundlePath}`);
    }
    catch (error) {
        console.error('❌ Export failed:', error);
        process.exit(1);
    }
});
if (require.main === module) {
    program.parse();
}
