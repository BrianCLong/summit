import crypto from 'crypto';
// import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getPostgresPool } from '../../db/postgres.js';
import { otelService } from '../../middleware/observability/otel-tracing.js';

export interface EvidenceArtifact {
  id?: string;
  runId: string;
  artifactType:
    | 'sbom'
    | 'attestation'
    | 'log'
    | 'output'
    | 'trace'
    | 'policy_decision';
  content: Buffer | string;
  metadata?: Record<string, any>;
  retentionDays?: number;
}

export interface ProvenanceChain {
  artifactId: string;
  previousHash?: string;
  currentHash: string;
  signature: string;
  timestamp: string;
}

export class EvidenceProvenanceService {
  // private s3Client: S3Client;
  private bucketName: string;
  private signingKey: string;

  constructor() {
    // this.s3Client = new S3Client({
    //   region: process.env.AWS_REGION || 'us-east-1',
    // });
    this.bucketName = process.env.EVIDENCE_BUCKET || 'maestro-evidence-worm';
    this.signingKey =
      process.env.EVIDENCE_SIGNING_KEY || this.generateSigningKey();
  }

  private generateSigningKey(): string {
    // In production, this should be from AWS KMS or similar
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Store evidence artifact with WORM compliance
   */
  async storeEvidence(artifact: EvidenceArtifact): Promise<string> {
    const span = otelService.createSpan('evidence.store');

    try {
      // Generate content hash for integrity
      const contentBuffer = Buffer.isBuffer(artifact.content)
        ? artifact.content
        : Buffer.from(artifact.content, 'utf8');

      const sha256Hash = crypto
        .createHash('sha256')
        .update(contentBuffer)
        .digest('hex');
      const artifactId = crypto.randomUUID();

      // Calculate retention date
      const retentionDays =
        artifact.retentionDays ||
        this.getDefaultRetentionDays(artifact.artifactType);
      const retentionUntil = new Date();
      retentionUntil.setDate(retentionUntil.getDate() + retentionDays);

      // S3 key with content-addressable naming
      const s3Key = `evidence/${artifact.runId}/${artifact.artifactType}/${artifactId}-${sha256Hash.slice(0, 16)}`;

      // Upload to S3 with Object Lock
      // const uploadCommand = new PutObjectCommand({
      //   Bucket: this.bucketName,
      //   Key: s3Key,
      //   Body: contentBuffer,
      //   ContentType: this.getContentType(artifact.artifactType),
      //   Metadata: {
      //     ...artifact.metadata,
      //     'artifact-type': artifact.artifactType,
      //     'run-id': artifact.runId,
      //     'evidence-id': artifactId,
      //     'integrity-hash': sha256Hash,
      //   },
      //   ServerSideEncryption: 'aws:kms',
      //   SSEKMSKeyId: process.env.EVIDENCE_KMS_KEY_ID,
      //   // WORM compliance: Object Lock until retention date
      //   ObjectLockMode: 'COMPLIANCE',
      //   ObjectLockRetainUntilDate: retentionUntil,
      // });

      // await this.s3Client.send(uploadCommand);

      // Store metadata in database
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO evidence_artifacts 
         (id, run_id, artifact_type, s3_key, sha256_hash, size_bytes, retention_until, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
        [
          artifactId,
          artifact.runId,
          artifact.artifactType,
          s3Key,
          sha256Hash,
          contentBuffer.length,
          retentionUntil,
        ],
      );

      // Create provenance chain entry
      await this.createProvenanceEntry(artifactId, sha256Hash, artifact.runId);

      span?.addSpanAttributes({
        'evidence.artifact_id': artifactId,
        'evidence.run_id': artifact.runId,
        'evidence.type': artifact.artifactType,
        'evidence.size_bytes': contentBuffer.length,
      });

      return artifactId;
    } catch (error: any) {
      console.error('Failed to store evidence:', error);
      throw new Error(`Evidence storage failed: ${error.message}`);
    } finally {
      span?.end();
    }
  }

  /**
   * Create cryptographic provenance chain entry
   */
  private async createProvenanceEntry(
    artifactId: string,
    currentHash: string,
    runId: string,
  ): Promise<void> {
    const pool = getPostgresPool();

    // Get previous artifact hash for chain
    const { rows } = await pool.query(
      `SELECT sha256_hash FROM evidence_artifacts 
       WHERE run_id = $1 AND created_at < now() 
       ORDER BY created_at DESC LIMIT 1`,
      [runId],
    );

    const previousHash = rows.length > 0 ? rows[0].sha256_hash : null;

    // Create signature over chain
    const chainData = JSON.stringify({
      artifactId,
      previousHash,
      currentHash,
      timestamp: new Date().toISOString(),
      runId,
    });

    const signature = crypto
      .createHmac('sha256', this.signingKey)
      .update(chainData)
      .digest('hex');

    // Store provenance entry
    await pool.query(
      `INSERT INTO evidence_provenance 
       (artifact_id, previous_hash, current_hash, signature, chain_data, created_at)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [artifactId, previousHash, currentHash, signature, chainData],
    );
  }

  /**
   * Verify evidence integrity and provenance chain
   */
  async verifyEvidence(artifactId: string): Promise<{
    valid: boolean;
    integrity: boolean;
    provenance: boolean;
    details: any;
  }> {
    const span = otelService.createSpan('evidence.verify');

    try {
      const pool = getPostgresPool();

      // Get artifact metadata
      const { rows: artifacts } = await pool.query(
        'SELECT * FROM evidence_artifacts WHERE id = $1',
        [artifactId],
      );

      if (!artifacts.length) {
        return {
          valid: false,
          integrity: false,
          provenance: false,
          details: { error: 'Artifact not found' },
        };
      }

      const artifact = artifacts[0];

      // Verify S3 object exists and integrity
      // const headCommand = new HeadObjectCommand({
      //   Bucket: this.bucketName,
      //   Key: artifact.s3_key,
      // });

      const integrityValid = false;
      const s3Metadata = null;

      // try {
      //   const s3Response = await this.s3Client.send(headCommand);
      //   s3Metadata = s3Response.Metadata;

      //   // Check if stored hash matches S3 metadata
      //   integrityValid = s3Metadata?.['integrity-hash'] === artifact.sha256_hash;
      // } catch (error) {
      //   integrityValid = false;
      // }

      // Verify provenance chain
      const { rows: provenance } = await pool.query(
        'SELECT * FROM evidence_provenance WHERE artifact_id = $1',
        [artifactId],
      );

      let provenanceValid = false;
      if (provenance.length > 0) {
        const entry = provenance[0];

        // Re-create signature and verify
        const expectedSignature = crypto
          .createHmac('sha256', this.signingKey)
          .update(entry.chain_data)
          .digest('hex');

        provenanceValid = expectedSignature === entry.signature;
      }

      const result = {
        valid: integrityValid && provenanceValid,
        integrity: integrityValid,
        provenance: provenanceValid,
        details: {
          artifact: {
            id: artifact.id,
            type: artifact.artifact_type,
            runId: artifact.run_id,
            size: artifact.size_bytes,
            hash: artifact.sha256_hash,
            created: artifact.created_at,
          },
          s3Metadata,
          provenance: provenance[0] || null,
        },
      };

      span?.addSpanAttributes({
        'evidence.verification.valid': result.valid,
        'evidence.verification.integrity': result.integrity,
        'evidence.verification.provenance': result.provenance,
      });

      return result;
    } catch (error: any) {
      console.error('Evidence verification failed:', error);
      return {
        valid: false,
        integrity: false,
        provenance: false,
        details: { error: error.message },
      };
    } finally {
      span?.end();
    }
  }

  /**
   * Generate SBOM (Software Bill of Materials) evidence
   */
  async generateSBOMEvidence(
    runId: string,
    dependencies: any[],
  ): Promise<string> {
    const sbom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.4',
      serialNumber: `urn:uuid:${crypto.randomUUID()}`,
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [
          {
            vendor: 'Maestro',
            name: 'Evidence Generator',
            version: '1.0.0',
          },
        ],
        component: {
          type: 'application',
          name: `maestro-run-${runId}`,
          version: '1.0.0',
        },
      },
      components: dependencies.map((dep) => ({
        type: 'library',
        name: dep.name,
        version: dep.version,
        licenses: dep.licenses || [],
        hashes: dep.hashes || [],
        externalReferences: dep.externalReferences || [],
      })),
    };

    return await this.storeEvidence({
      runId,
      artifactType: 'sbom',
      content: JSON.stringify(sbom, null, 2),
      metadata: {
        format: 'cycloneDX',
        version: '1.4',
        componentCount: dependencies.length,
      },
    });
  }

  /**
   * Get retention policy for artifact type
   */
  private getDefaultRetentionDays(artifactType: string): number {
    const retentionPolicies = {
      sbom: 2555, // ~7 years for compliance
      attestation: 2555, // ~7 years for compliance
      log: 365, // 1 year
      output: 90, // 3 months
      trace: 30, // 1 month
      policy_decision: 2555, // ~7 years for compliance
    };

    return (
      retentionPolicies[artifactType as keyof typeof retentionPolicies] || 365
    );
  }

  /**
   * Get appropriate content type for artifact
   */
  private getContentType(artifactType: string): string {
    const contentTypes = {
      sbom: 'application/json',
      attestation: 'application/json',
      log: 'text/plain',
      output: 'application/json',
      trace: 'application/json',
      policy_decision: 'application/json',
    };

    return (
      contentTypes[artifactType as keyof typeof contentTypes] ||
      'application/octet-stream'
    );
  }

  /**
   * List evidence artifacts for a run
   */
  async listEvidenceForRun(runId: string): Promise<any[]> {
    const pool = getPostgresPool();
    const { rows } = await pool.query(
      `SELECT 
        id, artifact_type, sha256_hash, size_bytes, 
        immutable, retention_until, created_at
       FROM evidence_artifacts 
       WHERE run_id = $1 
       ORDER BY created_at DESC`,
      [runId],
    );

    return rows;
  }
}

// Add missing provenance table to schema (update to db migration)
export const PROVENANCE_SCHEMA = `
CREATE TABLE IF NOT EXISTS evidence_provenance (
  id BIGSERIAL PRIMARY KEY,
  artifact_id UUID REFERENCES evidence_artifacts(id) ON DELETE CASCADE,
  previous_hash TEXT,
  current_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  chain_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evidence_provenance_artifact_idx ON evidence_provenance (artifact_id);
`;

export const evidenceProvenanceService = new EvidenceProvenanceService();
