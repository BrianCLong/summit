/**
 * Air-Gapped Proxy Ingestion
 * Supports ingestion in disconnected/air-gapped environments via file transfer or local proxy
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import pino from 'pino';
import type { StixBundle, StixObject, IngestionMetadata } from '../types/stix-2.1.js';
import type { TaxiiFeedConfig, TaxiiSyncResult } from '../types/taxii-2.1.js';

const logger = pino({ name: 'airgap-proxy' });

export interface AirgapExportPackage {
  id: string;
  version: '1.0';
  exportedAt: string;
  expiresAt: string;
  feedConfig: TaxiiFeedConfig;
  checksum: string;
  bundles: StixBundle[];
  metadata: {
    totalObjects: number;
    objectTypes: Record<string, number>;
    dateRange: {
      earliest: string;
      latest: string;
    };
  };
}

export interface AirgapImportResult {
  packageId: string;
  success: boolean;
  feedId: string;
  objectsImported: number;
  objectsSkipped: number;
  objectsFailed: number;
  errors: Array<{ objectId?: string; message: string }>;
  importedAt: string;
  durationMs: number;
}

export interface AirgapProxyConfig {
  /** Directory for export packages (external side) */
  exportDir: string;
  /** Directory for import packages (air-gapped side) */
  importDir: string;
  /** Directory for processed packages */
  processedDir: string;
  /** Maximum age of packages in hours before they're considered stale */
  maxPackageAgeHours: number;
  /** Whether to delete packages after successful import */
  deleteAfterImport: boolean;
  /** Encryption key for package encryption (optional) */
  encryptionKey?: string;
}

export class AirgapProxy {
  private readonly config: AirgapProxyConfig;

  constructor(config: Partial<AirgapProxyConfig> = {}) {
    this.config = {
      exportDir: config.exportDir || '/var/lib/stix-taxii/export',
      importDir: config.importDir || '/var/lib/stix-taxii/import',
      processedDir: config.processedDir || '/var/lib/stix-taxii/processed',
      maxPackageAgeHours: config.maxPackageAgeHours || 72,
      deleteAfterImport: config.deleteAfterImport ?? true,
      encryptionKey: config.encryptionKey,
    };
  }

  // =========================================================================
  // Export (External/Connected Side)
  // =========================================================================

  /**
   * Create an export package from STIX objects for transfer to air-gapped environment
   */
  async createExportPackage(
    feedConfig: TaxiiFeedConfig,
    objects: StixObject[],
    options: { expiresInHours?: number } = {}
  ): Promise<AirgapExportPackage> {
    const expiresInHours = options.expiresInHours || this.config.maxPackageAgeHours;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

    // Group objects into bundles (max 1000 per bundle for manageability)
    const bundles: StixBundle[] = [];
    const chunkSize = 1000;

    for (let i = 0; i < objects.length; i += chunkSize) {
      const chunk = objects.slice(i, i + chunkSize);
      bundles.push({
        type: 'bundle',
        id: `bundle--${crypto.randomUUID()}`,
        objects: chunk,
      });
    }

    // Calculate object type statistics
    const objectTypes: Record<string, number> = {};
    let earliest: string | undefined;
    let latest: string | undefined;

    for (const obj of objects) {
      objectTypes[obj.type] = (objectTypes[obj.type] || 0) + 1;

      const created = (obj as { created?: string }).created;
      if (created) {
        if (!earliest || created < earliest) earliest = created;
        if (!latest || created > latest) latest = created;
      }
    }

    const pkg: Omit<AirgapExportPackage, 'checksum'> = {
      id: `airgap-pkg--${crypto.randomUUID()}`,
      version: '1.0',
      exportedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      feedConfig,
      bundles,
      metadata: {
        totalObjects: objects.length,
        objectTypes,
        dateRange: {
          earliest: earliest || now.toISOString(),
          latest: latest || now.toISOString(),
        },
      },
    };

    // Calculate checksum
    const content = JSON.stringify(pkg);
    const checksum = createHash('sha256').update(content).digest('hex');

    const finalPackage: AirgapExportPackage = {
      ...pkg,
      checksum,
    };

    logger.info(
      {
        packageId: finalPackage.id,
        feedId: feedConfig.id,
        objectCount: objects.length,
        bundleCount: bundles.length,
      },
      'Created air-gap export package'
    );

    return finalPackage;
  }

  /**
   * Write export package to disk for physical transfer
   */
  async writeExportPackage(pkg: AirgapExportPackage): Promise<string> {
    const filename = `${pkg.id}_${pkg.feedConfig.id}_${Date.now()}.json`;
    const filepath = join(this.config.exportDir, filename);

    let content = JSON.stringify(pkg, null, 2);

    // Optional encryption
    if (this.config.encryptionKey) {
      content = this.encrypt(content);
    }

    writeFileSync(filepath, content, 'utf-8');

    logger.info({ filepath, packageId: pkg.id }, 'Wrote export package to disk');

    return filepath;
  }

  // =========================================================================
  // Import (Air-Gapped Side)
  // =========================================================================

  /**
   * List available import packages
   */
  listImportPackages(): Array<{
    filepath: string;
    filename: string;
    size: number;
    modifiedAt: string;
  }> {
    if (!existsSync(this.config.importDir)) {
      return [];
    }

    const files = readdirSync(this.config.importDir)
      .filter((f) => f.endsWith('.json'))
      .map((filename) => {
        const filepath = join(this.config.importDir, filename);
        const stats = statSync(filepath);
        return {
          filepath,
          filename,
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        };
      });

    return files.sort((a, b) => a.modifiedAt.localeCompare(b.modifiedAt));
  }

  /**
   * Read and validate an import package
   */
  async readImportPackage(filepath: string): Promise<AirgapExportPackage> {
    if (!existsSync(filepath)) {
      throw new Error(`Package file not found: ${filepath}`);
    }

    let content = readFileSync(filepath, 'utf-8');

    // Decrypt if encrypted
    if (this.config.encryptionKey) {
      content = this.decrypt(content);
    }

    const pkg: AirgapExportPackage = JSON.parse(content);

    // Validate package structure
    this.validatePackage(pkg);

    // Validate checksum
    const expectedChecksum = pkg.checksum;
    const pkgWithoutChecksum = { ...pkg, checksum: undefined };
    const actualChecksum = createHash('sha256')
      .update(JSON.stringify(pkgWithoutChecksum))
      .digest('hex');

    if (actualChecksum !== expectedChecksum) {
      throw new Error('Package checksum validation failed - data may be corrupted');
    }

    // Check expiration
    if (new Date(pkg.expiresAt) < new Date()) {
      throw new Error(`Package has expired: ${pkg.expiresAt}`);
    }

    logger.info(
      { packageId: pkg.id, feedId: pkg.feedConfig.id },
      'Read and validated import package'
    );

    return pkg;
  }

  /**
   * Import a package and return all STIX objects with metadata
   */
  async importPackage(
    filepath: string,
    onProgress?: (progress: { current: number; total: number }) => void
  ): Promise<AirgapImportResult> {
    const startTime = Date.now();
    const result: AirgapImportResult = {
      packageId: '',
      success: false,
      feedId: '',
      objectsImported: 0,
      objectsSkipped: 0,
      objectsFailed: 0,
      errors: [],
      importedAt: new Date().toISOString(),
      durationMs: 0,
    };

    try {
      const pkg = await this.readImportPackage(filepath);
      result.packageId = pkg.id;
      result.feedId = pkg.feedConfig.id;

      const totalObjects = pkg.metadata.totalObjects;
      let processed = 0;

      for (const bundle of pkg.bundles) {
        for (const obj of bundle.objects) {
          try {
            // Object is already in STIX format, just count as imported
            result.objectsImported++;
            processed++;

            if (onProgress && processed % 100 === 0) {
              onProgress({ current: processed, total: totalObjects });
            }
          } catch (error) {
            result.objectsFailed++;
            result.errors.push({
              objectId: obj.id,
              message: (error as Error).message,
            });
          }
        }
      }

      result.success = result.objectsFailed === 0;

      // Move to processed directory
      if (this.config.deleteAfterImport) {
        unlinkSync(filepath);
      } else {
        const processedPath = join(
          this.config.processedDir,
          `${basename(filepath, '.json')}_imported_${Date.now()}.json`
        );
        writeFileSync(processedPath, readFileSync(filepath));
        unlinkSync(filepath);
      }
    } catch (error) {
      result.errors.push({ message: (error as Error).message });
    }

    result.durationMs = Date.now() - startTime;

    logger.info(
      {
        packageId: result.packageId,
        imported: result.objectsImported,
        failed: result.objectsFailed,
        durationMs: result.durationMs,
      },
      'Completed package import'
    );

    return result;
  }

  /**
   * Extract all STIX objects from a package
   */
  extractObjects(pkg: AirgapExportPackage): Array<{
    object: StixObject;
    metadata: IngestionMetadata;
  }> {
    const results: Array<{ object: StixObject; metadata: IngestionMetadata }> = [];

    for (const bundle of pkg.bundles) {
      for (const obj of bundle.objects) {
        results.push({
          object: obj,
          metadata: {
            feedId: pkg.feedConfig.id,
            feedName: pkg.feedConfig.name,
            ingestedAt: new Date().toISOString(),
            source: 'airgap-import',
            batchId: pkg.id,
          },
        });
      }
    }

    return results;
  }

  // =========================================================================
  // Cleanup & Maintenance
  // =========================================================================

  /**
   * Clean up stale packages
   */
  async cleanupStalePackages(): Promise<{ deleted: number; errors: string[] }> {
    const result = { deleted: 0, errors: [] as string[] };
    const maxAgeMs = this.config.maxPackageAgeHours * 60 * 60 * 1000;
    const cutoffTime = Date.now() - maxAgeMs;

    for (const dir of [this.config.exportDir, this.config.importDir]) {
      if (!existsSync(dir)) continue;

      const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

      for (const filename of files) {
        const filepath = join(dir, filename);
        try {
          const stats = statSync(filepath);
          if (stats.mtime.getTime() < cutoffTime) {
            unlinkSync(filepath);
            result.deleted++;
            logger.info({ filepath }, 'Deleted stale package');
          }
        } catch (error) {
          result.errors.push(`Failed to process ${filepath}: ${(error as Error).message}`);
        }
      }
    }

    return result;
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private validatePackage(pkg: unknown): asserts pkg is AirgapExportPackage {
    const p = pkg as Record<string, unknown>;

    if (!p.id || typeof p.id !== 'string') {
      throw new Error('Invalid package: missing or invalid id');
    }
    if (p.version !== '1.0') {
      throw new Error(`Unsupported package version: ${p.version}`);
    }
    if (!p.exportedAt || typeof p.exportedAt !== 'string') {
      throw new Error('Invalid package: missing or invalid exportedAt');
    }
    if (!p.feedConfig || typeof p.feedConfig !== 'object') {
      throw new Error('Invalid package: missing or invalid feedConfig');
    }
    if (!Array.isArray(p.bundles)) {
      throw new Error('Invalid package: missing or invalid bundles');
    }
  }

  /**
   * Simple XOR encryption (for demonstration - use proper encryption in production)
   */
  private encrypt(content: string): string {
    if (!this.config.encryptionKey) return content;

    const key = this.config.encryptionKey;
    const bytes = Buffer.from(content);
    const encrypted = Buffer.alloc(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      encrypted[i] = bytes[i] ^ key.charCodeAt(i % key.length);
    }

    return `ENCRYPTED:${encrypted.toString('base64')}`;
  }

  private decrypt(content: string): string {
    if (!this.config.encryptionKey || !content.startsWith('ENCRYPTED:')) {
      return content;
    }

    const key = this.config.encryptionKey;
    const encrypted = Buffer.from(content.slice(10), 'base64');
    const decrypted = Buffer.alloc(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ key.charCodeAt(i % key.length);
    }

    return decrypted.toString('utf-8');
  }
}

/**
 * Factory function to create an air-gap proxy
 */
export function createAirgapProxy(config?: Partial<AirgapProxyConfig>): AirgapProxy {
  return new AirgapProxy(config);
}
