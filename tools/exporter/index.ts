#!/usr/bin/env ts-node

import { Command } from 'commander';
import { createWriteStream, createReadStream } from 'fs';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { spawn } from 'child_process';
import * as tar from 'tar';
import { trace, Span } from '@opentelemetry/api';
import { pg } from '../../server/src/db/pg';
import { neo } from '../../server/src/db/neo4j';

const tracer = trace.getTracer('export-tool', '24.3.0');

interface ExportManifest {
  version: string;
  exportId: string;
  tenantId: string;
  region: string;
  purpose: string;
  requestedBy: string;
  exportedBy: string;
  createdAt: string;
  expiresAt: string;
  dataClassifications: string[];
  provenance: ProvenanceEntry[];
  files: FileManifest[];
  checksums: Record<string, string>;
  signature?: string;
  attestation?: string;
}

interface ProvenanceEntry {
  timestamp: string;
  action: string;
  actor: string;
  region: string;
  purpose: string;
  dataTypes: string[];
}

interface FileManifest {
  filename: string;
  type: 'postgresql' | 'neo4j' | 'metadata';
  size: number;
  checksum: string;
  compressed: boolean;
  encryption?: {
    algorithm: string;
    keyId: string;
  };
}

interface ExportOptions {
  tenantId: string;
  purpose: string;
  requestedBy: string;
  outputDir: string;
  includePostgres: boolean;
  includeNeo4j: boolean;
  includeMetadata: boolean;
  compress: boolean;
  encrypt: boolean;
  sign: boolean;
  cosignKey?: string;
  expirationDays: number;
  dataClassifications?: string[];
}

class ExportTool {
  private exportId: string;
  private workDir: string;
  private manifest: ExportManifest;

  constructor() {
    this.exportId = `export-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    this.workDir = `/tmp/${this.exportId}`;
  }

  async exportTenantData(options: ExportOptions): Promise<string> {
    return tracer.startActiveSpan('export.tenant_data', async (span: Span) => {
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
        await mkdir(this.workDir, { recursive: true });

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
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async initializeManifest(options: ExportOptions): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + options.expirationDays * 24 * 60 * 60 * 1000,
    );

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

  private async exportPostgreSQL(options: ExportOptions): Promise<void> {
    return tracer.startActiveSpan('export.postgresql', async (span: Span) => {
      console.log('📊 Exporting PostgreSQL data...');

      const filename = `postgresql-${this.exportId}.sql`;
      const filepath = join(this.workDir, filename);

      try {
        // Export tenant-specific data using pg_dump with custom queries
        const exportQuery = this.buildPostgreSQLExportQuery(options.tenantId);

        // Use pg_dump with custom query
        await this.runCommand('pg_dump', [
          process.env.DATABASE_URL!,
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
      } catch (error) {
        span.recordException(error as Error);
        throw new Error(
          `PostgreSQL export failed: ${(error as Error).message}`,
        );
      } finally {
        span.end();
      }
    });
  }

  private async exportNeo4j(options: ExportOptions): Promise<void> {
    return tracer.startActiveSpan('export.neo4j', async (span: Span) => {
      console.log('🕸️ Exporting Neo4j data...');

      const filename = `neo4j-${this.exportId}.cypher`;
      const filepath = join(this.workDir, filename);

      try {
        // Export tenant-specific nodes and relationships
        const cypherQueries = [
          `MATCH (n) WHERE n.tenant_id = '${options.tenantId}' RETURN n`,
          `MATCH (n)-[r]->(m) WHERE n.tenant_id = '${options.tenantId}' AND m.tenant_id = '${options.tenantId}' RETURN n, r, m`,
        ];

        let exportData = '';
        for (const query of cypherQueries) {
          const result = await neo.run(
            query,
            {},
            { tenantId: options.tenantId },
          );

          // Convert result to Cypher CREATE statements
          exportData += this.convertNeo4jResultToCypher(result);
        }

        await writeFile(filepath, exportData, 'utf8');

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
      } catch (error) {
        span.recordException(error as Error);
        throw new Error(`Neo4j export failed: ${(error as Error).message}`);
      } finally {
        span.end();
      }
    });
  }

  private async exportMetadata(options: ExportOptions): Promise<void> {
    return tracer.startActiveSpan('export.metadata', async (span: Span) => {
      console.log('📋 Exporting metadata...');

      const filename = `metadata-${this.exportId}.json`;
      const filepath = join(this.workDir, filename);

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

        await writeFile(filepath, JSON.stringify(metadata, null, 2), 'utf8');

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
      } catch (error) {
        span.recordException(error as Error);
        throw new Error(`Metadata export failed: ${(error as Error).message}`);
      } finally {
        span.end();
      }
    });
  }

  private async generateChecksums(): Promise<void> {
    console.log('🔐 Generating checksums...');

    for (const file of this.manifest.files) {
      const filepath = join(this.workDir, file.filename);
      const checksum = await this.calculateFileChecksum(filepath);
      this.manifest.checksums[file.filename] = checksum;
      file.checksum = checksum;
    }
  }

  private async createBundle(options: ExportOptions): Promise<string> {
    return tracer.startActiveSpan(
      'export.create_bundle',
      async (span: Span) => {
        console.log('📦 Creating export bundle...');

        // Write manifest to file
        const manifestPath = join(this.workDir, 'manifest.json');
        await writeFile(
          manifestPath,
          JSON.stringify(this.manifest, null, 2),
          'utf8',
        );

        // Create tar bundle
        const bundleName = `${this.exportId}-${options.tenantId}.tar.gz`;
        const bundlePath = join(options.outputDir, bundleName);

        // Ensure output directory exists
        await mkdir(dirname(bundlePath), { recursive: true });

        // Create compressed tar
        await tar.create(
          {
            gzip: true,
            file: bundlePath,
            cwd: this.workDir,
          },
          ['manifest.json', ...this.manifest.files.map((f) => f.filename)],
        );

        span.setAttributes({
          bundle_path: bundlePath,
          bundle_size: (await this.getFileStats(bundlePath)).size,
        });

        console.log(`✅ Bundle created: ${bundlePath}`);
        return bundlePath;
      },
    );
  }

  private async signBundle(
    bundlePath: string,
    cosignKey: string,
  ): Promise<void> {
    return tracer.startActiveSpan('export.sign_bundle', async (span: Span) => {
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
      } catch (error) {
        span.recordException(error as Error);
        throw new Error(`Bundle signing failed: ${(error as Error).message}`);
      } finally {
        span.end();
      }
    });
  }

  private async createAttestation(
    bundlePath: string,
    options: ExportOptions,
  ): Promise<void> {
    return tracer.startActiveSpan(
      'export.create_attestation',
      async (span: Span) => {
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
        await writeFile(
          attestationPath,
          JSON.stringify(attestation, null, 2),
          'utf8',
        );

        this.manifest.attestation = attestationPath;

        span.setAttributes({
          attestation_file: attestationPath,
          predicate_type: attestation.predicateType,
        });

        console.log(`✅ Attestation created: ${attestationPath}`);
      },
    );
  }

  // Helper methods
  private buildPostgreSQLExportQuery(tenantId: string): string {
    return `
      SELECT * FROM audit_logs WHERE tenant_id = '${tenantId}'
      UNION ALL
      SELECT * FROM coherence_scores WHERE tenant_id = '${tenantId}'
      UNION ALL
      SELECT * FROM user_sessions WHERE tenant_id = '${tenantId}';
    `;
  }

  private convertNeo4jResultToCypher(result: any): string {
    let cypher = '';

    for (const record of result.records) {
      const keys = record.keys;
      for (const key of keys) {
        const value = record.get(key);
        if (value.labels) {
          // Node
          cypher += `CREATE (${key}:${value.labels.join(':')} ${JSON.stringify(value.properties)})\n`;
        } else if (value.type) {
          // Relationship
          cypher += `// Relationship: ${value.type}\n`;
        }
      }
    }

    return cypher;
  }

  private async getTenantInfo(tenantId: string): Promise<any> {
    return await pg.oneOrNone(
      'SELECT tenant_id, region_tag, residency_region, residency_class, created_at FROM tenants WHERE tenant_id = $1',
      [tenantId],
      { tenantId },
    );
  }

  private async getSchemaInfo(): Promise<any> {
    const pgSchema = await pg.many(
      'SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = $1',
      ['public'],
    );
    return { postgresql: pgSchema };
  }

  private async getDataStatistics(tenantId: string): Promise<any> {
    const stats = {
      postgresql: {},
      neo4j: {},
    };

    // PostgreSQL stats
    const tables = ['audit_logs', 'coherence_scores', 'user_sessions'];
    for (const table of tables) {
      const result = await pg.oneOrNone(
        `SELECT COUNT(*) as count FROM ${table} WHERE tenant_id = $1`,
        [tenantId],
        { tenantId },
      );
      stats.postgresql[table] = parseInt(result?.count || '0');
    }

    // Neo4j stats
    const nodeResult = await neo.run(
      'MATCH (n) WHERE n.tenant_id = $tenantId RETURN count(n) as count',
      { tenantId },
      { tenantId },
    );
    stats.neo4j.nodes = nodeResult.records[0]?.get('count')?.toNumber() || 0;

    return stats;
  }

  private getDataTypes(options: ExportOptions): string[] {
    const types: string[] = [];
    if (options.includePostgres) types.push('postgresql');
    if (options.includeNeo4j) types.push('neo4j');
    if (options.includeMetadata) types.push('metadata');
    return types;
  }

  private getMediaType(type: string): string {
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

  private async getFileStats(
    filepath: string,
  ): Promise<{ size: number; checksum: string }> {
    const stats = await import('fs').then((fs) => fs.promises.stat(filepath));
    const checksum = await this.calculateFileChecksum(filepath);
    return { size: stats.size, checksum };
  }

  private async calculateFileChecksum(filepath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(filepath);

      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private async runCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: 'inherit' });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on('error', reject);
    });
  }
}

// CLI Interface
const program = new Command();

program
  .name('maestro-export')
  .description('Maestro Conductor v24.3.0 - Tenant Data Export Tool')
  .version('24.3.0');

program
  .command('export')
  .description('Export tenant data with signed attestation')
  .requiredOption('-t, --tenant-id <tenantId>', 'Tenant ID to export')
  .requiredOption(
    '-p, --purpose <purpose>',
    'Purpose of export (legal_compliance, data_migration, analytics, backup)',
  )
  .requiredOption(
    '-r, --requested-by <email>',
    'Email of person requesting export',
  )
  .requiredOption(
    '-o, --output-dir <dir>',
    'Output directory for export bundle',
  )
  .option('--include-postgres', 'Include PostgreSQL data', true)
  .option('--include-neo4j', 'Include Neo4j data', true)
  .option('--include-metadata', 'Include metadata', true)
  .option('--compress', 'Compress export bundle', true)
  .option('--encrypt', 'Encrypt export bundle', false)
  .option('--sign', 'Sign export bundle with cosign', true)
  .option('--cosign-key <path>', 'Path to cosign private key')
  .option('--expiration-days <days>', 'Days until export expires', '30')
  .option(
    '--data-classifications <classifications>',
    'Comma-separated data classifications',
  )
  .action(async (options) => {
    try {
      const exportTool = new ExportTool();

      const exportOptions: ExportOptions = {
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
    } catch (error) {
      console.error('❌ Export failed:', error);
      process.exit(1);
    }
  });

if (require.main === module) {
  program.parse();
}
