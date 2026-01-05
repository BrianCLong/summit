import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import pino from 'pino';
import { getPostgresPool } from '../db/postgres.js';
import { otelService } from '../middleware/observability/otel-tracing.js';
import { openIncident } from '../incident.js';

const INLINE_PREFIX = 'inline://';

export type EvidenceMismatchType = 'missing_content' | 'hash_mismatch';

export interface EvidenceIntegrityMismatch {
  artifactId: string;
  runId: string;
  artifactType: string;
  expectedHash: string;
  computedHash: string | null;
  fileHash?: string | null;
  storagePath: string;
  mismatchType: EvidenceMismatchType;
  remediation: string;
}

export interface EvidenceVerificationResult {
  checked: number;
  passed: number;
  mismatches: EvidenceIntegrityMismatch[];
  chunksProcessed: number;
}

interface EvidenceArtifactRow {
  id: string;
  run_id: string;
  artifact_type: string;
  sha256_hash: string;
  s3_key: string;
  created_at: Date;
}

interface VerifyOptions {
  chunkSize?: number;
  rateLimitPerSecond?: number;
  emitIncidents?: boolean;
}

export class EvidenceIntegrityService {
  private readonly logger = (pino as any)({ name: 'EvidenceIntegrityService' });
  private readonly pool;
  private readonly storageRoot: string;

  constructor(options?: { storageRoot?: string; pool?: { query: Function } }) {
    this.storageRoot =
      options?.storageRoot ||
      process.env.EVIDENCE_STORAGE_ROOT ||
      path.resolve(process.cwd(), 'uploads/evidence');
    this.pool = options?.pool || getPostgresPool();
  }

  async verifyAll(
    options: VerifyOptions = {},
  ): Promise<EvidenceVerificationResult> {
    const chunkSize = Math.max(
      1,
      options.chunkSize ?? Number(process.env.EVIDENCE_INTEGRITY_CHUNK ?? 50),
    );
    const rateLimitPerSecond = Math.max(
      1,
      options.rateLimitPerSecond ?? Number(process.env.EVIDENCE_INTEGRITY_RPS ?? 5),
    );
    const emitIncidents = options.emitIncidents ?? false;
    const minIntervalMs = Math.ceil(1000 / rateLimitPerSecond);

    const span = otelService.createSpan('evidence.integrity.verify');

    let cursor: { createdAt?: Date; id?: string } = {};
    let checked = 0;
    let chunksProcessed = 0;
    const mismatches: EvidenceIntegrityMismatch[] = [];
    let lastProcessed = 0;

    try {
      while (true) {
        const rows = await this.fetchChunk(cursor, chunkSize);
        if (!rows.length) break;
        chunksProcessed += 1;

        for (const artifact of rows) {
          const now = Date.now();
          const delta = now - lastProcessed;
          if (delta < minIntervalMs) {
            await new Promise((resolve) => setTimeout(resolve, minIntervalMs - delta));
          }
          lastProcessed = Date.now();

          const mismatch = await this.verifyArtifact(artifact);
          checked += 1;

          if (mismatch) {
            mismatches.push(mismatch);
            if (emitIncidents) {
              await openIncident({
                runbook: 'evidence-integrity',
                tenant: artifact.run_id || 'global',
                severity: 'CRITICAL',
                reason: mismatch.mismatchType,
                details: mismatch,
              });
            }
          }
        }

        const last = rows[rows.length - 1];
        cursor = { createdAt: last.created_at, id: last.id };
      }

      const passed = checked - mismatches.length;
      span?.addSpanAttributes({
        'evidence.integrity.checked': checked,
        'evidence.integrity.mismatches': mismatches.length,
        'evidence.integrity.chunks': chunksProcessed,
      });

      return { checked, passed, mismatches, chunksProcessed };
    } catch (error: any) {
      this.logger.error({ err: error }, 'Evidence integrity verification failed');
      throw error;
    } finally {
      span?.end();
    }
  }

  private async fetchChunk(cursor: { createdAt?: Date; id?: string }, limit: number) {
    const params: Array<string | Date | number | null> = [];
    let whereClause = '';
    if (cursor.createdAt && cursor.id) {
      params.push(cursor.createdAt, cursor.id);
      whereClause =
        'WHERE (created_at > $1 OR (created_at = $1 AND id > $2))';
    }

    params.push(limit);

    const { rows } = await this.pool.query(
      `SELECT id, run_id, artifact_type, sha256_hash, s3_key, created_at
       FROM evidence_artifacts
       ${whereClause}
       ORDER BY created_at, id
       LIMIT $${params.length}`,
      params,
    );

    return rows as EvidenceArtifactRow[];
  }

  private async verifyArtifact(
    artifact: EvidenceArtifactRow,
  ): Promise<EvidenceIntegrityMismatch | null> {
    const storagePath = this.resolveStoragePath(artifact.s3_key);

    const contentBuffer = await this.loadContent(artifact, storagePath);

    if (!contentBuffer) {
      return {
        artifactId: artifact.id,
        runId: artifact.run_id,
        artifactType: artifact.artifact_type,
        expectedHash: artifact.sha256_hash,
        computedHash: null,
        fileHash: null,
        storagePath,
        mismatchType: 'missing_content',
        remediation:
          'Restore the artifact content from backup or regenerate it from the source run.',
      };
    }

    const computedHash = crypto
      .createHash('sha256')
      .update(contentBuffer)
      .digest('hex');

    if (computedHash !== artifact.sha256_hash) {
      return {
        artifactId: artifact.id,
        runId: artifact.run_id,
        artifactType: artifact.artifact_type,
        expectedHash: artifact.sha256_hash,
        computedHash,
        fileHash: computedHash,
        storagePath,
        mismatchType: 'hash_mismatch',
        remediation:
          'Re-ingest the artifact and reissue provenance to correct the stored hash.',
      };
    }

    return null;
  }

  private resolveStoragePath(s3Key: string): string {
    if (s3Key.startsWith(INLINE_PREFIX)) {
      return s3Key;
    }
    if (path.isAbsolute(s3Key)) {
      return s3Key;
    }
    return path.join(this.storageRoot, s3Key);
  }

  private async loadContent(
    artifact: EvidenceArtifactRow,
    storagePath: string,
  ): Promise<Buffer | null> {
    if (storagePath.startsWith(INLINE_PREFIX)) {
      const contentId = artifact.id;
      const { rows } = await this.pool.query(
        'SELECT content FROM evidence_artifact_content WHERE artifact_id = $1',
        [contentId],
      );
      if (!rows.length) return null;
      return (rows[0] as { content: Buffer }).content;
    }

    try {
      return await fs.readFile(storagePath);
    } catch (error: any) {
      this.logger.warn({ artifactId: artifact.id, storagePath, err: error }, 'Failed to read artifact content');
      return null;
    }
  }
}

export const evidenceIntegrityService = new EvidenceIntegrityService();
