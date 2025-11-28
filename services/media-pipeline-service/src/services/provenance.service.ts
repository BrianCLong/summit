/**
 * Provenance Service
 *
 * Records provenance and evidence for all media pipeline transforms.
 */

import axios, { AxiosInstance } from 'axios';
import type { MediaAsset, Transcript, Provenance } from '../types/media.js';
import type { ProvenanceRecord, ProvenanceEventType } from '../types/events.js';
import { createChildLogger } from '../utils/logger.js';
import { generateId, hashString, hashObject } from '../utils/hash.js';
import { now } from '../utils/time.js';
import config from '../config/index.js';

export interface ProvenanceRecordInput {
  mediaAssetId: string;
  transcriptId?: string;
  eventType: ProvenanceEventType;
  transformStep?: string;
  transformProvider?: string;
  transformVersion?: string;
  inputChecksum?: string;
  outputChecksum?: string;
  caseId?: string;
  metadata?: Record<string, unknown>;
}

export interface ProvenanceResult {
  success: boolean;
  recordId?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export class ProvenanceService {
  private log = createChildLogger({ service: 'ProvenanceService' });
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.provLedgerUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'x-authority-id': config.authorityId,
        'x-reason-for-access': 'media-pipeline-provenance',
      },
    });
  }

  /**
   * Record evidence for a media asset
   */
  async recordEvidence(mediaAsset: MediaAsset): Promise<ProvenanceResult> {
    const correlationId = generateId();

    this.log.info(
      { mediaAssetId: mediaAsset.id, correlationId },
      'Recording evidence for media asset'
    );

    try {
      const record: ProvenanceRecord = {
        id: generateId(),
        mediaAssetId: mediaAsset.id,
        eventType: 'evidence.registered',
        timestamp: now(),
        sourceRef: mediaAsset.sourceRef || mediaAsset.storage.key,
        checksum: mediaAsset.checksum,
        authorityId: config.authorityId,
        reasonForAccess: 'media-pipeline-ingest',
        policyLabels: this.extractPolicyLabels(mediaAsset.policy),
        caseId: mediaAsset.caseId,
        metadata: {
          type: mediaAsset.type,
          format: mediaAsset.format,
          filename: mediaAsset.metadata.filename,
          size: mediaAsset.metadata.size,
          duration: mediaAsset.metadata.duration,
          storage: mediaAsset.storage,
        },
      };

      const result = await this.sendRecord(record);

      this.log.info(
        { mediaAssetId: mediaAsset.id, recordId: record.id, correlationId },
        'Evidence recorded'
      );

      return {
        success: true,
        recordId: result.id || record.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.log.error(
        { mediaAssetId: mediaAsset.id, correlationId, error: message },
        'Failed to record evidence'
      );

      return {
        success: false,
        error: {
          code: 'EVIDENCE_RECORD_FAILED',
          message,
          retryable: true,
        },
      };
    }
  }

  /**
   * Record a transform in the provenance chain
   */
  async recordTransform(input: ProvenanceRecordInput): Promise<ProvenanceResult> {
    const correlationId = generateId();

    this.log.info(
      {
        mediaAssetId: input.mediaAssetId,
        transformStep: input.transformStep,
        correlationId,
      },
      'Recording transform'
    );

    try {
      const record: ProvenanceRecord = {
        id: generateId(),
        mediaAssetId: input.mediaAssetId,
        transcriptId: input.transcriptId,
        eventType: 'transform.recorded',
        timestamp: now(),
        sourceRef: `transform:${input.transformStep}`,
        checksum: input.outputChecksum || '',
        transformStep: input.transformStep,
        transformProvider: input.transformProvider,
        transformVersion: input.transformVersion,
        inputChecksum: input.inputChecksum,
        outputChecksum: input.outputChecksum,
        authorityId: config.authorityId,
        reasonForAccess: 'media-pipeline-transform',
        caseId: input.caseId,
        metadata: input.metadata,
      };

      const result = await this.sendRecord(record);

      this.log.info(
        { mediaAssetId: input.mediaAssetId, recordId: record.id, correlationId },
        'Transform recorded'
      );

      return {
        success: true,
        recordId: result.id || record.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.log.error(
        { mediaAssetId: input.mediaAssetId, correlationId, error: message },
        'Failed to record transform'
      );

      return {
        success: false,
        error: {
          code: 'TRANSFORM_RECORD_FAILED',
          message,
          retryable: true,
        },
      };
    }
  }

  /**
   * Record a claim about a transcript or media asset
   */
  async recordClaim(
    mediaAssetId: string,
    transcriptId: string | undefined,
    content: unknown,
    caseId?: string
  ): Promise<ProvenanceResult> {
    const correlationId = generateId();

    this.log.info(
      { mediaAssetId, transcriptId, correlationId },
      'Recording claim'
    );

    try {
      const record: ProvenanceRecord = {
        id: generateId(),
        mediaAssetId,
        transcriptId,
        eventType: 'claim.created',
        timestamp: now(),
        sourceRef: `claim:${mediaAssetId}`,
        checksum: hashObject(content),
        authorityId: config.authorityId,
        reasonForAccess: 'media-pipeline-claim',
        caseId,
        metadata: { content },
      };

      const result = await this.sendRecord(record);

      this.log.info(
        { mediaAssetId, recordId: record.id, correlationId },
        'Claim recorded'
      );

      return {
        success: true,
        recordId: result.id || record.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.log.error(
        { mediaAssetId, correlationId, error: message },
        'Failed to record claim'
      );

      return {
        success: false,
        error: {
          code: 'CLAIM_RECORD_FAILED',
          message,
          retryable: true,
        },
      };
    }
  }

  /**
   * Build provenance object for a media asset transform chain
   */
  buildProvenance(
    mediaAsset: MediaAsset,
    transforms: Array<{
      step: string;
      provider?: string;
      version?: string;
      checksum?: string;
    }>
  ): Provenance {
    return {
      sourceId: mediaAsset.id,
      sourceType: 'media_asset',
      ingestedAt: mediaAsset.createdAt,
      ingestedBy: config.authorityId,
      transformChain: transforms.map((t) => ({
        step: t.step,
        timestamp: now(),
        provider: t.provider,
        version: t.version,
        checksum: t.checksum,
      })),
      originalChecksum: mediaAsset.checksum,
      currentChecksum: transforms.length > 0 ? transforms[transforms.length - 1].checksum : undefined,
    };
  }

  /**
   * Get provenance chain for a media asset
   */
  async getProvenanceChain(mediaAssetId: string): Promise<ProvenanceRecord[]> {
    try {
      const response = await this.client.get(`/evidence`, {
        params: { sourceRef: `media:${mediaAssetId}` },
      });
      return response.data.records || [];
    } catch (error) {
      this.log.error({ mediaAssetId, error }, 'Failed to get provenance chain');
      return [];
    }
  }

  /**
   * Send record to provenance ledger
   */
  private async sendRecord(record: ProvenanceRecord): Promise<{ id?: string }> {
    try {
      const response = await this.client.post('/evidence', {
        sourceRef: record.sourceRef,
        checksum: record.checksum,
        caseId: record.caseId,
        transformChain: [
          {
            step: record.transformStep || record.eventType,
            timestamp: record.timestamp,
            provider: record.transformProvider,
            version: record.transformVersion,
          },
        ],
        policyLabels: record.policyLabels,
        content: record.metadata,
      });
      return { id: response.data.id };
    } catch (error) {
      // In development/test, simulate success
      if (config.nodeEnv !== 'production') {
        this.log.warn(
          { recordId: record.id },
          'Prov-ledger unavailable, simulating record creation'
        );
        return { id: record.id };
      }
      throw error;
    }
  }

  /**
   * Extract policy labels array from policy object
   */
  private extractPolicyLabels(policy?: Record<string, unknown>): string[] {
    if (!policy) return [];

    const labels: string[] = [];
    if (policy.sensitivity) labels.push(`sensitivity:${policy.sensitivity}`);
    if (policy.classification) labels.push(`classification:${policy.classification}`);
    if (policy.clearance) labels.push(`clearance:${policy.clearance}`);
    return labels;
  }
}

export const provenanceService = new ProvenanceService();
export default provenanceService;
