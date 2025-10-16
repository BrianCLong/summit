// server/src/conductor/compliance/evidence-store.ts

// import {
//   S3Client,
//   PutObjectCommand,
//   GetObjectCommand,
//   ListObjectsV2Command,
// } from '@aws-sdk/client-s3';
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
  evidenceType:
    | 'log'
    | 'screenshot'
    | 'configuration'
    | 'attestation'
    | 'report';
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

// private s3Client: S3Client;

// constructor(config: EvidenceStorageConfig) {
//   this.config = config;
//   this.s3Client = new S3Client({
//     region: config.region,
//     maxAttempts: 3,
//     retryMode: 'adaptive',
//   });
// }

// async storeEvidence(
//   evidence: Buffer | string,
//   metadata: Omit<EvidenceMetadata, 'hash' | 'size' | 'compressed'>,
// ): Promise<EvidenceMetadata> {
//   const startTime = Date.now();

//   try {
//     let evidenceBuffer = Buffer.isBuffer(evidence) ? evidence : Buffer.from(evidence, 'utf8');
//     let compressed = false;

//     if (evidenceBuffer.length > this.config.compressionThreshold) {
//       evidenceBuffer = await gzipAsync(evidenceBuffer);
//       compressed = true;
//     }

//     const hash = createHash('sha256').update(evidenceBuffer).digest('hex');

//     const objectKey = this.buildEvidenceKey({
//       ...metadata,
//       hash,
//       size: evidenceBuffer.length,
//       compressed,
//     });

//     const uploadCommand = new PutObjectCommand({
//       Bucket: this.config.bucketName,
//       Key: objectKey,
//       Body: evidenceBuffer,
//       ContentType: this.getContentType(metadata.evidenceType),
//       ServerSideEncryption: this.config.kmsKeyId ? 'aws:kms' : 'AES256',
//       SSEKMSKeyId: this.config.kmsKeyId,
//       Metadata: {
//         evidenceId: metadata.evidenceId,
//         tenantId: metadata.tenantId,
//         controlId: metadata.controlId,
//         framework: metadata.framework,
//         evidenceType: metadata.evidenceType,
//         hash,
//         compressed: compressed.toString(),
//         ...metadata.tags,
//       },
//       Tagging: this.buildLifecycleTags(metadata.retentionClass, metadata.framework),
//     });

// await this.s3Client.send(uploadCommand);

//     const finalMetadata: EvidenceMetadata = {
//       ...metadata,
//       hash,
//       size: evidenceBuffer.length,
//       compressed,
//     };

//     prometheusConductorMetrics.recordOperationalMetric(
//       'evidence_store_upload_size',
//       evidenceBuffer.length,
//     );
//     prometheusConductorMetrics.recordOperationalMetric(
//       'evidence_store_upload_duration',
//       Date.now() - startTime,
//     );
//     prometheusConductorMetrics.recordOperationalEvent('evidence_store_upload_success', true);

//     logger.info('Evidence stored successfully', {
//       evidenceId: metadata.evidenceId,
//       tenantId: metadata.tenantId,
//       controlId: metadata.controlId,
//       framework: metadata.framework,
//       size: evidenceBuffer.length,
//       compressed,
//       objectKey,
//     });

//     return finalMetadata;
//   } catch (error) {
//     prometheusConductorMetrics.recordOperationalEvent('evidence_store_upload_error', false);
//     logger.error('Failed to store evidence', {
//       evidenceId: metadata.evidenceId,
//       error: error.message,
//       stack: error.stack,
//     });
//     throw new Error(`Evidence storage failed: ${error.message}`);
//   }
// }

// async retrieveEvidence(
//   evidenceId: string,
//   tenantId: string,
// ): Promise<{
//   data: Buffer;
//   metadata: EvidenceMetadata;
// }> {
//   const startTime = Date.now();

//   try {
//     const objectKey = await this.findEvidenceKey(evidenceId, tenantId);
//     if (!objectKey) {
//       throw new Error(`Evidence not found: ${evidenceId}`);
//     }

//     const getCommand = new GetObjectCommand({
//       Bucket: this.config.bucketName,
//       Key: objectKey,
//     });

//     const response = await this.s3Client.send(getCommand);
//     if (!response.Body) {
//       throw new Error('Empty evidence body received');
//     }

//     const chunks: Buffer[] = [];
//     for await (const chunk of response.Body as any) {
//       chunks.push(chunk);
//     }
//     let evidenceData = Buffer.concat(chunks);

//     const compressed = response.Metadata?.compressed === 'true';
//     if (compressed) {
//       evidenceData = await gunzipAsync(evidenceData);
//     }

//     const metadata: EvidenceMetadata = {
//       evidenceId: response.Metadata?.evidenceid || evidenceId,
//       tenantId: response.Metadata?.tenantid || tenantId,
//       controlId: response.Metadata?.controlid || '',
//       framework: response.Metadata?.framework || '',
//       evidenceType: (response.Metadata?.evidencetype as any) || 'log',
//       timestamp: response.LastModified || new Date(),
//       retentionClass: this.parseRetentionClass(response.TagSet),
//       hash: response.Metadata?.hash || '',
//       size: evidenceData.length,
//       compressed,
//       tags: this.parseCustomTags(response.Metadata),
//     };

//     const computedHash = createHash('sha256').update(evidenceData).digest('hex');
//     if (metadata.hash && computedHash !== metadata.hash) {
//       throw new Error(`Evidence integrity check failed for ${evidenceId}`);
//     }

//     prometheusConductorMetrics.recordOperationalMetric(
//       'evidence_store_download_size',
//       evidenceData.length,
//     );
//     prometheusConductorMetrics.recordOperationalMetric(
//       'evidence_store_download_duration',
//       Date.now() - startTime,
//     );
//     prometheusConductorMetrics.recordOperationalEvent('evidence_store_download_success', true);

//     return {
//       data: evidenceData,
//       metadata,
//     };
//   } catch (error) {
//     prometheusConductorMetrics.recordOperationalEvent('evidence_store_download_error', false);
//     logger.error('Failed to retrieve evidence', {
//       evidenceId,
//       tenantId,
//       error: error.message,
//     });
//     throw error;
//   }
// }

// async listEvidence(filters: {
//   tenantId: string;
//   controlId?: string;
//   framework?: string;
//   evidenceType?: string;
//   startDate?: Date;
//   endDate?: Date;
//   retentionClass?: string;
//   limit?: number;
//   continuationToken?: string;
// }): Promise<{
//   evidence: EvidenceMetadata[];
//   continuationToken?: string;
// }> {
//   try {
//     const prefix = this.buildSearchPrefix(filters);

//     const listCommand = new ListObjectsV2Command({
//       Bucket: this.config.bucketName,
//       Prefix: prefix,
//       MaxKeys: filters.limit || 1000,
//       ContinuationToken: filters.continuationToken,
//     });

//     // const response = await this.s3Client.send(listCommand);

//     const evidence: EvidenceMetadata[] = [];

//     if (response.Contents) {
//       for (const object of response.Contents) {
//         if (!object.Key) continue;

//         const metadata = await this.parseEvidenceMetadata(object.Key, object.LastModified);

//         if (this.matchesFilters(metadata, filters)) {
//           evidence.push(metadata);
//         }
//       }
//     }

//     return {
//       evidence: evidence.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
//       continuationToken: response.NextContinuationToken,
//     };
//   } catch (error) {
//     logger.error('Failed to list evidence', { filters, error: error.message });
//     throw error;
//   }
// }

// async applyLegalHold(evidenceIds: string[], tenantId: string, holdId: string): Promise<void> {
//   try {
//     for (const evidenceId of evidenceIds) {
//       const objectKey = await this.findEvidenceKey(evidenceId, tenantId);
//       if (!objectKey) continue;

//       await this.s3Client.send(
//         new PutObjectCommand({
//           Bucket: this.config.bucketName,
//           Key: objectKey,
//           Tagging: `legal_hold=true&hold_id=${holdId}&hold_date=${Date.now()}`,
//         }),
//       );
//     }

//     logger.info('Legal hold applied', {
//       tenantId,
//       holdId,
//       evidenceCount: evidenceIds.length,
//     });
//   } catch (error) {
//     logger.error('Failed to apply legal hold', {
//       tenantId,
//       holdId,
//       evidenceIds,
//       error: error.message,
//     });
//     throw error;
//   }
// }

// private async findEvidenceKey(evidenceId: string, tenantId: string): Promise<string | null> {
//   const listCommand = new ListObjectsV2Command({
//     Bucket: this.config.bucketName,
//     Prefix: `evidence/`,
//     MaxKeys: 1000,
//   });

//   const response = await this.s3Client.send(listCommand);

//   if (response.Contents) {
//     for (const object of response.Contents) {
//       if (object.Key?.includes(evidenceId) && object.Key?.includes(tenantId)) {
//         return object.Key;
//       }
//     }
//   }

//   return null;
// }
