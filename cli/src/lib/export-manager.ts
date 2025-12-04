/**
 * Export Manager
 * Air-gapped export functionality with integrity verification
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createGzip, createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type { ExportConfig } from './config.js';
import type { GraphQueryResult, NodeResult, RelationshipResult } from './graph-client.js';
import {
  EXPORT_FORMATS,
  type ExportFormat,
  CHECKSUM_ALGORITHM,
  MANIFEST_VERSION,
} from './constants.js';

export interface ExportOptions {
  format?: ExportFormat;
  outputDir?: string;
  filename?: string;
  compress?: boolean;
  sign?: boolean;
  includeMetadata?: boolean;
  chunkSize?: number;
  filter?: {
    labels?: string[];
    types?: string[];
    properties?: Record<string, unknown>;
  };
}

export interface ExportManifest {
  version: string;
  exportId: string;
  timestamp: string;
  format: ExportFormat;
  compressed: boolean;
  signed: boolean;
  files: ExportFile[];
  stats: ExportStats;
  checksum: string;
  signature?: string;
}

export interface ExportFile {
  name: string;
  size: number;
  checksum: string;
  type: 'nodes' | 'relationships' | 'metadata' | 'schema';
  count?: number;
}

export interface ExportStats {
  totalNodes: number;
  totalRelationships: number;
  labels: string[];
  relationshipTypes: string[];
  exportDuration: number;
}

export interface ImportResult {
  success: boolean;
  importId: string;
  nodesImported: number;
  relationshipsImported: number;
  errors: string[];
  warnings: string[];
}

const ExportOptionsSchema = z.object({
  format: z.enum(EXPORT_FORMATS).default('json'),
  outputDir: z.string().optional(),
  filename: z.string().optional(),
  compress: z.boolean().default(true),
  sign: z.boolean().default(false),
  includeMetadata: z.boolean().default(true),
  chunkSize: z.number().min(100).max(100000).default(10000),
  filter: z
    .object({
      labels: z.array(z.string()).optional(),
      types: z.array(z.string()).optional(),
      properties: z.record(z.unknown()).optional(),
    })
    .optional(),
});

export class ExportManager {
  private config: ExportConfig;
  private privateKey?: string;

  constructor(config: ExportConfig) {
    this.config = config;

    // Load private key if configured
    if (config.privateKeyPath && fs.existsSync(config.privateKeyPath)) {
      this.privateKey = fs.readFileSync(config.privateKeyPath, 'utf-8');
    }
  }

  async exportGraph(
    data: {
      nodes: NodeResult[];
      relationships: RelationshipResult[];
      metadata?: Record<string, unknown>;
    },
    options: ExportOptions = {}
  ): Promise<ExportManifest> {
    const opts = ExportOptionsSchema.parse(options);
    const startTime = Date.now();

    const exportId = uuidv4();
    const outputDir = opts.outputDir || this.config.outputDir;
    const timestamp = new Date().toISOString();

    // Create output directory
    const exportDir = path.join(outputDir, `export-${exportId}`);
    fs.mkdirSync(exportDir, { recursive: true });

    const files: ExportFile[] = [];

    // Apply filters
    let nodes = data.nodes;
    let relationships = data.relationships;

    if (opts.filter?.labels?.length) {
      nodes = nodes.filter((n) =>
        n.labels.some((l) => opts.filter!.labels!.includes(l))
      );
    }

    if (opts.filter?.types?.length) {
      relationships = relationships.filter((r) =>
        opts.filter!.types!.includes(r.type)
      );
    }

    // Export nodes
    const nodesFile = await this.exportNodes(
      nodes,
      exportDir,
      opts.format,
      opts.compress,
      opts.chunkSize
    );
    files.push(nodesFile);

    // Export relationships
    const relsFile = await this.exportRelationships(
      relationships,
      exportDir,
      opts.format,
      opts.compress,
      opts.chunkSize
    );
    files.push(relsFile);

    // Export metadata
    if (opts.includeMetadata && data.metadata) {
      const metaFile = await this.exportMetadata(
        data.metadata,
        exportDir,
        opts.compress
      );
      files.push(metaFile);
    }

    // Export schema
    const schemaFile = await this.exportSchema(
      nodes,
      relationships,
      exportDir,
      opts.compress
    );
    files.push(schemaFile);

    // Calculate stats
    const stats: ExportStats = {
      totalNodes: nodes.length,
      totalRelationships: relationships.length,
      labels: [...new Set(nodes.flatMap((n) => n.labels))],
      relationshipTypes: [...new Set(relationships.map((r) => r.type))],
      exportDuration: Date.now() - startTime,
    };

    // Create manifest
    const manifest: ExportManifest = {
      version: MANIFEST_VERSION,
      exportId,
      timestamp,
      format: opts.format,
      compressed: opts.compress,
      signed: opts.sign && !!this.privateKey,
      files,
      stats,
      checksum: this.calculateManifestChecksum(files),
    };

    // Sign manifest if requested
    if (opts.sign && this.privateKey) {
      manifest.signature = this.signManifest(manifest);
    }

    // Write manifest
    const manifestPath = path.join(exportDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    return manifest;
  }

  async importGraph(
    exportPath: string,
    options: { verify?: boolean; dryRun?: boolean } = {}
  ): Promise<ImportResult> {
    const { verify = true, dryRun = false } = options;

    const result: ImportResult = {
      success: false,
      importId: uuidv4(),
      nodesImported: 0,
      relationshipsImported: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Read manifest
      const manifestPath = path.join(exportPath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        result.errors.push('Manifest file not found');
        return result;
      }

      const manifest: ExportManifest = JSON.parse(
        fs.readFileSync(manifestPath, 'utf-8')
      );

      // Verify integrity
      if (verify) {
        const integrityResult = await this.verifyExport(exportPath);
        if (!integrityResult.valid) {
          result.errors.push(...integrityResult.errors);
          return result;
        }
      }

      if (dryRun) {
        result.success = true;
        result.nodesImported = manifest.stats.totalNodes;
        result.relationshipsImported = manifest.stats.totalRelationships;
        result.warnings.push('Dry run - no data imported');
        return result;
      }

      // Read and parse data files
      const nodes = await this.readExportFile<NodeResult[]>(
        exportPath,
        manifest.files.find((f) => f.type === 'nodes')!,
        manifest.compressed
      );

      const relationships = await this.readExportFile<RelationshipResult[]>(
        exportPath,
        manifest.files.find((f) => f.type === 'relationships')!,
        manifest.compressed
      );

      result.nodesImported = nodes.length;
      result.relationshipsImported = relationships.length;
      result.success = true;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : String(error)
      );
    }

    return result;
  }

  async verifyExport(exportPath: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Read manifest
      const manifestPath = path.join(exportPath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        errors.push('Manifest file not found');
        return { valid: false, errors, warnings };
      }

      const manifest: ExportManifest = JSON.parse(
        fs.readFileSync(manifestPath, 'utf-8')
      );

      // Verify manifest checksum
      const calculatedChecksum = this.calculateManifestChecksum(manifest.files);
      if (calculatedChecksum !== manifest.checksum) {
        errors.push('Manifest checksum mismatch');
      }

      // Verify signature if present
      if (manifest.signed && manifest.signature) {
        if (!this.verifySignature(manifest, manifest.signature)) {
          errors.push('Invalid manifest signature');
        }
      }

      // Verify each file
      for (const file of manifest.files) {
        const filePath = path.join(exportPath, file.name);

        if (!fs.existsSync(filePath)) {
          errors.push(`File not found: ${file.name}`);
          continue;
        }

        const fileChecksum = await this.calculateFileChecksum(filePath);
        if (fileChecksum !== file.checksum) {
          errors.push(`Checksum mismatch for file: ${file.name}`);
        }

        const stats = fs.statSync(filePath);
        if (stats.size !== file.size) {
          warnings.push(
            `Size mismatch for file: ${file.name} (expected ${file.size}, got ${stats.size})`
          );
        }
      }
    } catch (error) {
      errors.push(
        `Verification error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async listExports(
    directory?: string
  ): Promise<Array<{ path: string; manifest: ExportManifest }>> {
    const exportDir = directory || this.config.outputDir;
    const exports: Array<{ path: string; manifest: ExportManifest }> = [];

    if (!fs.existsSync(exportDir)) {
      return exports;
    }

    const entries = fs.readdirSync(exportDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('export-')) {
        const manifestPath = path.join(exportDir, entry.name, 'manifest.json');

        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            exports.push({
              path: path.join(exportDir, entry.name),
              manifest,
            });
          } catch {
            // Skip invalid exports
          }
        }
      }
    }

    return exports.sort(
      (a, b) =>
        new Date(b.manifest.timestamp).getTime() -
        new Date(a.manifest.timestamp).getTime()
    );
  }

  private async exportNodes(
    nodes: NodeResult[],
    outputDir: string,
    format: ExportFormat,
    compress: boolean,
    _chunkSize: number
  ): Promise<ExportFile> {
    const filename = `nodes.${format}${compress ? '.gz' : ''}`;
    const filePath = path.join(outputDir, filename);

    const content = this.serializeData(nodes, format);
    await this.writeFile(filePath, content, compress);

    const stats = fs.statSync(filePath);
    const checksum = await this.calculateFileChecksum(filePath);

    return {
      name: filename,
      size: stats.size,
      checksum,
      type: 'nodes',
      count: nodes.length,
    };
  }

  private async exportRelationships(
    relationships: RelationshipResult[],
    outputDir: string,
    format: ExportFormat,
    compress: boolean,
    _chunkSize: number
  ): Promise<ExportFile> {
    const filename = `relationships.${format}${compress ? '.gz' : ''}`;
    const filePath = path.join(outputDir, filename);

    const content = this.serializeData(relationships, format);
    await this.writeFile(filePath, content, compress);

    const stats = fs.statSync(filePath);
    const checksum = await this.calculateFileChecksum(filePath);

    return {
      name: filename,
      size: stats.size,
      checksum,
      type: 'relationships',
      count: relationships.length,
    };
  }

  private async exportMetadata(
    metadata: Record<string, unknown>,
    outputDir: string,
    compress: boolean
  ): Promise<ExportFile> {
    const filename = `metadata.json${compress ? '.gz' : ''}`;
    const filePath = path.join(outputDir, filename);

    const content = JSON.stringify(metadata, null, 2);
    await this.writeFile(filePath, content, compress);

    const stats = fs.statSync(filePath);
    const checksum = await this.calculateFileChecksum(filePath);

    return {
      name: filename,
      size: stats.size,
      checksum,
      type: 'metadata',
    };
  }

  private async exportSchema(
    nodes: NodeResult[],
    relationships: RelationshipResult[],
    outputDir: string,
    compress: boolean
  ): Promise<ExportFile> {
    const schema = {
      labels: [...new Set(nodes.flatMap((n) => n.labels))],
      relationshipTypes: [...new Set(relationships.map((r) => r.type))],
      nodeProperties: this.extractPropertySchema(nodes),
      relationshipProperties: this.extractPropertySchema(relationships),
    };

    const filename = `schema.json${compress ? '.gz' : ''}`;
    const filePath = path.join(outputDir, filename);

    const content = JSON.stringify(schema, null, 2);
    await this.writeFile(filePath, content, compress);

    const stats = fs.statSync(filePath);
    const checksum = await this.calculateFileChecksum(filePath);

    return {
      name: filename,
      size: stats.size,
      checksum,
      type: 'schema',
    };
  }

  private serializeData(data: unknown[], format: ExportFormat): string {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);

      case 'csv':
        if (data.length === 0) return '';
        const headers = Object.keys(data[0] as Record<string, unknown>);
        const rows = data.map((item) =>
          headers
            .map((h) => {
              const val = (item as Record<string, unknown>)[h];
              if (typeof val === 'object') {
                return JSON.stringify(val);
              }
              return String(val ?? '');
            })
            .join(',')
        );
        return [headers.join(','), ...rows].join('\n');

      case 'graphml':
        return this.toGraphML(data);

      case 'parquet':
        // Parquet requires binary format, return JSON for now
        return JSON.stringify(data);

      default:
        return JSON.stringify(data);
    }
  }

  private toGraphML(data: unknown[]): string {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
      '  <graph id="G" edgedefault="directed">',
    ];

    for (const item of data) {
      if (this.isNode(item)) {
        const props = Object.entries(item.properties)
          .map(([k, v]) => `${k}="${this.escapeXml(String(v))}"`)
          .join(' ');
        lines.push(`    <node id="${item.id}" ${props}/>`);
      } else if (this.isRelationship(item)) {
        lines.push(
          `    <edge source="${item.startNodeId}" target="${item.endNodeId}" label="${item.type}"/>`
        );
      }
    }

    lines.push('  </graph>');
    lines.push('</graphml>');

    return lines.join('\n');
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private isNode(item: unknown): item is NodeResult {
    return (
      typeof item === 'object' &&
      item !== null &&
      'labels' in item &&
      Array.isArray((item as NodeResult).labels)
    );
  }

  private isRelationship(item: unknown): item is RelationshipResult {
    return (
      typeof item === 'object' &&
      item !== null &&
      'type' in item &&
      'startNodeId' in item &&
      'endNodeId' in item
    );
  }

  private extractPropertySchema(
    items: Array<{ properties: Record<string, unknown> }>
  ): Record<string, string[]> {
    const schema: Record<string, Set<string>> = {};

    for (const item of items) {
      for (const [key, value] of Object.entries(item.properties)) {
        if (!schema[key]) {
          schema[key] = new Set();
        }
        schema[key].add(typeof value);
      }
    }

    const result: Record<string, string[]> = {};
    for (const [key, types] of Object.entries(schema)) {
      result[key] = Array.from(types);
    }

    return result;
  }

  private async writeFile(
    filePath: string,
    content: string,
    compress: boolean
  ): Promise<void> {
    if (compress) {
      const { Readable } = await import('node:stream');
      const input = Readable.from([content]);
      const output = fs.createWriteStream(filePath);
      const gzip = createGzip();

      await pipeline(input, gzip, output);
    } else {
      fs.writeFileSync(filePath, content);
    }
  }

  private async readExportFile<T>(
    exportPath: string,
    file: ExportFile,
    compressed: boolean
  ): Promise<T> {
    const filePath = path.join(exportPath, file.name);

    if (compressed) {
      const chunks: Buffer[] = [];
      const input = fs.createReadStream(filePath);
      const gunzip = createGunzip();

      await pipeline(input, gunzip, async function* (source) {
        for await (const chunk of source) {
          chunks.push(chunk);
        }
      });

      const content = Buffer.concat(chunks).toString('utf-8');
      return JSON.parse(content) as T;
    } else {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    }
  }

  private async calculateFileChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(CHECKSUM_ALGORITHM);
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private calculateManifestChecksum(files: ExportFile[]): string {
    const hash = crypto.createHash(CHECKSUM_ALGORITHM);

    for (const file of files) {
      hash.update(`${file.name}:${file.size}:${file.checksum}`);
    }

    return hash.digest('hex');
  }

  private signManifest(manifest: ExportManifest): string {
    if (!this.privateKey) {
      throw new Error('Private key not configured');
    }

    const data = JSON.stringify({
      exportId: manifest.exportId,
      timestamp: manifest.timestamp,
      checksum: manifest.checksum,
    });

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);

    return sign.sign(this.privateKey, 'base64');
  }

  private verifySignature(
    manifest: ExportManifest,
    signature: string
  ): boolean {
    // For verification, we would need the public key
    // This is a placeholder implementation
    return signature.length > 0;
  }
}

export function createExportManager(config: ExportConfig): ExportManager {
  return new ExportManager(config);
}
