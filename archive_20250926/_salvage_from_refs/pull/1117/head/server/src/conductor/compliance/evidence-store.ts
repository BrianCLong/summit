// server/src/conductor/compliance/evidence-store.ts

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { createHash } from 'crypto';
import { promisify } from 'util';
import { gzip, gunzip } from 'zlib';
import logger from '../../config/logger.js';
import { prometheusConductorMetrics } from '../observability/prometheus.js';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface EvidenceMetadata {
  evidenceId: string;
  tenantId: string;
  controlId: string;
  framework: string; // SOC2, GDPR, NIST, etc.
  evidenceType: 'log' | 'screenshot' | 'configuration' | 'attestation' | 'report';
  timestamp: Date;
  retentionClass: 'hot' | 'warm' | 'cold' | 'legal_hold';
  hash: string;
  size: number;
  compressed: boolean;
  tags: Record<string, string>;
}

export interface EvidenceStorageConfig {
  bucketName: string;
  region: string;
  kmsKeyId?: string; // For encryption at rest
  retentionPolicies: {
    hot: number; // days
    warm: number; // days
    cold: number; // days
    legal_hold: number; // days
  };
  compressionThreshold: number; // bytes
}

export class ComplianceEvidenceStore {
  private s3Client: S3Client;
  private config: EvidenceStorageConfig;

  constructor(config: EvidenceStorageConfig) {
    this.config = config;
    this.s3Client = new S3Client({
      region: config.region,
      maxAttempts: 3,
      retryMode: 'adaptive',
    });
  }

  /**
   * Store compliance evidence with automatic classification and lifecycle management
   */
  async storeEvidence(
    evidence: Buffer | string,
    metadata: Omit<EvidenceMetadata, 'hash' | 'size' | 'compressed'>,
  ): Promise<EvidenceMetadata> {
    const startTime = Date.now();

    try {
      let evidenceBuffer = Buffer.isBuffer(evidence) ? evidence : Buffer.from(evidence, 'utf8');
      let compressed = false;

      // Compress large evidence files
      if (evidenceBuffer.length > this.config.compressionThreshold) {
        evidenceBuffer = await gzipAsync(evidenceBuffer);
        compressed = true;
      }

      // Calculate content hash for integrity verification
      const hash = createHash('sha256').update(evidenceBuffer).digest('hex');

      // Build S3 object key with hierarchical structure for efficient querying
      const objectKey = this.buildEvidenceKey({
        ...metadata,
        hash,
        size: evidenceBuffer.length,
        compressed,
      });

      // Prepare S3 upload with metadata and lifecycle tags
      const uploadCommand = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: objectKey,
        Body: evidenceBuffer,
        ContentType: this.getContentType(metadata.evidenceType),
        ServerSideEncryption: this.config.kmsKeyId ? 'aws:kms' : 'AES256',
        SSEKMSKeyId: this.config.kmsKeyId,
        Metadata: {
          evidenceId: metadata.evidenceId,
          tenantId: metadata.tenantId,
          controlId: metadata.controlId,
          framework: metadata.framework,
          evidenceType: metadata.evidenceType,
          hash,
          compressed: compressed.toString(),
          ...metadata.tags,
        },
        Tagging: this.buildLifecycleTags(metadata.retentionClass, metadata.framework),
      });

      // Upload to S3
      await this.s3Client.send(uploadCommand);

      const finalMetadata: EvidenceMetadata = {
        ...metadata,
        hash,
        size: evidenceBuffer.length,
        compressed,
      };

      // Record metrics
      prometheusConductorMetrics.recordOperationalMetric(
        'evidence_store_upload_size',
        evidenceBuffer.length,
      );
      prometheusConductorMetrics.recordOperationalMetric(
        'evidence_store_upload_duration',
        Date.now() - startTime,
      );
      prometheusConductorMetrics.recordOperationalEvent('evidence_store_upload_success', true);

      // Log for audit trail
      logger.info('Evidence stored successfully', {
        evidenceId: metadata.evidenceId,
        tenantId: metadata.tenantId,
        controlId: metadata.controlId,
        framework: metadata.framework,
        size: evidenceBuffer.length,
        compressed,
        objectKey,
      });

      return finalMetadata;
    } catch (error) {
      prometheusConductorMetrics.recordOperationalEvent('evidence_store_upload_error', false);
      logger.error('Failed to store evidence', {
        evidenceId: metadata.evidenceId,
        error: error.message,
        stack: error.stack,
      });
      throw new Error(`Evidence storage failed: ${error.message}`);
    }
  }

  /**
   * Retrieve compliance evidence with automatic decompression
   */
  async retrieveEvidence(
    evidenceId: string,
    tenantId: string,
  ): Promise<{
    data: Buffer;
    metadata: EvidenceMetadata;
  }> {
    const startTime = Date.now();

    try {
      // Find evidence by scanning with prefix
      const objectKey = await this.findEvidenceKey(evidenceId, tenantId);
      if (!objectKey) {
        throw new Error(`Evidence not found: ${evidenceId}`);
      }

      // Retrieve from S3
      const getCommand = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: objectKey,
      });

      const response = await this.s3Client.send(getCommand);
      if (!response.Body) {
        throw new Error('Empty evidence body received');
      }

      // Read response body
      const chunks: Buffer[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      let evidenceData = Buffer.concat(chunks);

      // Decompress if needed
      const compressed = response.Metadata?.compressed === 'true';
      if (compressed) {
        evidenceData = await gunzipAsync(evidenceData);
      }

      // Build metadata from S3 metadata
      const metadata: EvidenceMetadata = {
        evidenceId: response.Metadata?.evidenceid || evidenceId,
        tenantId: response.Metadata?.tenantid || tenantId,
        controlId: response.Metadata?.controlid || '',
        framework: response.Metadata?.framework || '',
        evidenceType: (response.Metadata?.evidencetype as any) || 'log',
        timestamp: response.LastModified || new Date(),
        retentionClass: this.parseRetentionClass(response.TagSet),
        hash: response.Metadata?.hash || '',
        size: evidenceData.length,
        compressed,
        tags: this.parseCustomTags(response.Metadata),
      };

      // Verify integrity
      const computedHash = createHash('sha256').update(evidenceData).digest('hex');
      if (metadata.hash && computedHash !== metadata.hash) {
        throw new Error(`Evidence integrity check failed for ${evidenceId}`);
      }

      // Record metrics
      prometheusConductorMetrics.recordOperationalMetric(
        'evidence_store_download_size',
        evidenceData.length,
      );
      prometheusConductorMetrics.recordOperationalMetric(
        'evidence_store_download_duration',
        Date.now() - startTime,
      );
      prometheusConductorMetrics.recordOperationalEvent('evidence_store_download_success', true);

      return {
        data: evidenceData,
        metadata,
      };
    } catch (error) {
      prometheusConductorMetrics.recordOperationalEvent('evidence_store_download_error', false);
      logger.error('Failed to retrieve evidence', {
        evidenceId,
        tenantId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * List evidence for compliance reporting and audits
   */
  async listEvidence(filters: {
    tenantId: string;
    controlId?: string;
    framework?: string;
    evidenceType?: string;
    startDate?: Date;
    endDate?: Date;
    retentionClass?: string;
    limit?: number;
    continuationToken?: string;
  }): Promise<{
    evidence: EvidenceMetadata[];
    continuationToken?: string;
  }> {
    try {
      const prefix = this.buildSearchPrefix(filters);

      const listCommand = new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        Prefix: prefix,
        MaxKeys: filters.limit || 1000,
        ContinuationToken: filters.continuationToken,
      });

      const response = await this.s3Client.send(listCommand);

      const evidence: EvidenceMetadata[] = [];

      if (response.Contents) {
        for (const object of response.Contents) {
          if (!object.Key) continue;

          // Parse metadata from object key and tags
          const metadata = await this.parseEvidenceMetadata(object.Key, object.LastModified);

          // Apply additional filters
          if (this.matchesFilters(metadata, filters)) {
            evidence.push(metadata);
          }
        }
      }

      return {
        evidence: evidence.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
        continuationToken: response.NextContinuationToken,
      };
    } catch (error) {
      logger.error('Failed to list evidence', { filters, error: error.message });
      throw error;
    }
  }

  /**
   * Generate compliance report with evidence summary
   */
  async generateComplianceReport(
    tenantId: string,
    framework: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    framework: string;
    period: { start: Date; end: Date };
    summary: {
      totalEvidence: number;
      evidenceByType: Record<string, number>;
      evidenceByControl: Record<string, number>;
      totalSize: number;
      oldestEvidence: Date;
      newestEvidence: Date;
    };
    controls: Array<{
      controlId: string;
      evidenceCount: number;
      lastUpdated: Date;
      status: 'compliant' | 'non_compliant' | 'no_evidence';
    }>;
  }> {
    try {
      const evidence = await this.listEvidence({
        tenantId,
        framework,
        startDate,
        endDate,
        limit: 10000,
      });

      const summary = {
        totalEvidence: evidence.evidence.length,
        evidenceByType: {} as Record<string, number>,
        evidenceByControl: {} as Record<string, number>,
        totalSize: 0,
        oldestEvidence: new Date(),
        newestEvidence: new Date(0),
      };

      const controlMap = new Map<string, { count: number; lastUpdated: Date }>();

      evidence.evidence.forEach((item) => {
        // Aggregate by type
        summary.evidenceByType[item.evidenceType] =
          (summary.evidenceByType[item.evidenceType] || 0) + 1;

        // Aggregate by control
        summary.evidenceByControl[item.controlId] =
          (summary.evidenceByControl[item.controlId] || 0) + 1;

        // Update control tracking
        const existing = controlMap.get(item.controlId);
        controlMap.set(item.controlId, {
          count: (existing?.count || 0) + 1,
          lastUpdated:
            !existing || item.timestamp > existing.lastUpdated
              ? item.timestamp
              : existing.lastUpdated,
        });

        // Update totals
        summary.totalSize += item.size;
        if (item.timestamp < summary.oldestEvidence) {
          summary.oldestEvidence = item.timestamp;
        }
        if (item.timestamp > summary.newestEvidence) {
          summary.newestEvidence = item.timestamp;
        }
      });

      // Build control status report
      const controls = Array.from(controlMap.entries()).map(([controlId, data]) => ({
        controlId,
        evidenceCount: data.count,
        lastUpdated: data.lastUpdated,
        status: this.determineComplianceStatus(data.count, data.lastUpdated, framework) as
          | 'compliant'
          | 'non_compliant'
          | 'no_evidence',
      }));

      return {
        framework,
        period: { start: startDate, end: endDate },
        summary,
        controls,
      };
    } catch (error) {
      logger.error('Failed to generate compliance report', {
        tenantId,
        framework,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Apply legal hold to prevent evidence deletion
   */
  async applyLegalHold(evidenceIds: string[], tenantId: string, holdId: string): Promise<void> {
    try {
      for (const evidenceId of evidenceIds) {
        const objectKey = await this.findEvidenceKey(evidenceId, tenantId);
        if (!objectKey) continue;

        // Add legal hold tag
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.config.bucketName,
            Key: objectKey,
            Tagging: `legal_hold=true&hold_id=${holdId}&hold_date=${Date.now()}`,
          }),
        );
      }

      logger.info('Legal hold applied', {
        tenantId,
        holdId,
        evidenceCount: evidenceIds.length,
      });
    } catch (error) {
      logger.error('Failed to apply legal hold', {
        tenantId,
        holdId,
        evidenceIds,
        error: error.message,
      });
      throw error;
    }
  }

  // Private helper methods

  private buildEvidenceKey(metadata: EvidenceMetadata): string {
    const year = metadata.timestamp.getFullYear();
    const month = String(metadata.timestamp.getMonth() + 1).padStart(2, '0');
    const day = String(metadata.timestamp.getDate()).padStart(2, '0');

    return [
      'evidence',
      metadata.framework.toLowerCase(),
      metadata.tenantId,
      year,
      month,
      day,
      metadata.controlId,
      `${metadata.evidenceId}.${metadata.evidenceType}`,
    ].join('/');
  }

  private buildLifecycleTags(retentionClass: string, framework: string): string {
    return [
      `retention_class=${retentionClass}`,
      `framework=${framework}`,
      `created_date=${Date.now()}`,
      `compliance_evidence=true`,
    ].join('&');
  }

  private buildSearchPrefix(filters: any): string {
    const parts = ['evidence'];

    if (filters.framework) parts.push(filters.framework.toLowerCase());
    if (filters.tenantId) parts.push(filters.tenantId);

    return parts.join('/') + '/';
  }

  private async findEvidenceKey(evidenceId: string, tenantId: string): Promise<string | null> {
    const listCommand = new ListObjectsV2Command({
      Bucket: this.config.bucketName,
      Prefix: `evidence/`,
      MaxKeys: 1000,
    });

    const response = await this.s3Client.send(listCommand);

    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key?.includes(evidenceId) && object.Key?.includes(tenantId)) {
          return object.Key;
        }
      }
    }

    return null;
  }

  private getContentType(evidenceType: string): string {
    const contentTypes = {
      log: 'text/plain',
      screenshot: 'image/png',
      configuration: 'application/json',
      attestation: 'application/pdf',
      report: 'application/pdf',
    };

    return contentTypes[evidenceType] || 'application/octet-stream';
  }

  private parseRetentionClass(tagSet: any): 'hot' | 'warm' | 'cold' | 'legal_hold' {
    // Parse from S3 object tags
    return 'hot'; // Simplified - would parse from actual tags
  }

  private parseCustomTags(metadata: any): Record<string, string> {
    const tags = {};

    // Extract custom tags from S3 metadata
    Object.keys(metadata || {}).forEach((key) => {
      if (
        ![
          'evidenceid',
          'tenantid',
          'controlid',
          'framework',
          'evidencetype',
          'hash',
          'compressed',
        ].includes(key)
      ) {
        tags[key] = metadata[key];
      }
    });

    return tags;
  }

  private async parseEvidenceMetadata(
    objectKey: string,
    lastModified?: Date,
  ): Promise<EvidenceMetadata> {
    // Parse metadata from object key structure
    const parts = objectKey.split('/');
    const fileName = parts[parts.length - 1];
    const [evidenceId, evidenceType] = fileName.split('.');

    return {
      evidenceId,
      tenantId: parts[2] || '',
      controlId: parts[6] || '',
      framework: parts[1] || '',
      evidenceType: (evidenceType as any) || 'log',
      timestamp: lastModified || new Date(),
      retentionClass: 'hot',
      hash: '',
      size: 0,
      compressed: false,
      tags: {},
    };
  }

  private matchesFilters(metadata: EvidenceMetadata, filters: any): boolean {
    if (filters.controlId && metadata.controlId !== filters.controlId) return false;
    if (filters.evidenceType && metadata.evidenceType !== filters.evidenceType) return false;
    if (filters.retentionClass && metadata.retentionClass !== filters.retentionClass) return false;
    if (filters.startDate && metadata.timestamp < filters.startDate) return false;
    if (filters.endDate && metadata.timestamp > filters.endDate) return false;

    return true;
  }

  private determineComplianceStatus(
    evidenceCount: number,
    lastUpdated: Date,
    framework: string,
  ): string {
    const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

    // Framework-specific compliance rules
    const maxDaysSinceEvidence = framework === 'SOC2' ? 90 : 30;
    const minEvidenceCount = framework === 'SOC2' ? 1 : 2;

    if (evidenceCount === 0) return 'no_evidence';
    if (evidenceCount < minEvidenceCount || daysSinceUpdate > maxDaysSinceEvidence) {
      return 'non_compliant';
    }

    return 'compliant';
  }
}
