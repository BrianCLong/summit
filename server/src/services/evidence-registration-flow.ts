/**
 * Evidence Registration Flow
 * End-to-end helper for document ingestion → source → transforms → evidence → claims → graph
 */

import crypto from 'crypto';
import { ProvenanceLedgerBetaService } from './provenance-ledger-beta.js';
import logger from '../utils/logger.js';
import type {
  Source,
  Transform,
  Evidence,
  Claim,
  ClaimType,
} from '../types/provenance-beta.js';

export interface DocumentIngestionInput {
  documentPath: string;
  documentContent: string;
  userId: string;
  investigationId?: string;
  licenseId: string;
  metadata?: {
    format?: string;
    size_bytes?: number;
    author?: string;
    [key: string]: any;
  };
}

export interface IngestionResult {
  source: Source;
  transforms: Transform[];
  evidence: Evidence[];
  claims: Claim[];
  provenance_summary: {
    source_hash: string;
    transform_count: number;
    evidence_count: number;
    claim_count: number;
    total_duration_ms: number;
  };
}

export class EvidenceRegistrationFlow {
  private provenanceLedger: ProvenanceLedgerBetaService;

  constructor() {
    this.provenanceLedger = ProvenanceLedgerBetaService.getInstance();
  }

  /**
   * Complete flow: Ingest document → Register source → Apply transforms →
   * Register evidence → Extract and register claims
   */
  async ingestDocument(
    input: DocumentIngestionInput,
  ): Promise<IngestionResult> {
    const startTime = Date.now();
    const transforms: Transform[] = [];
    const evidence: Evidence[] = [];
    const claims: Claim[] = [];

    logger.info({
      message: 'Starting document ingestion flow',
      document_path: input.documentPath,
      user_id: input.userId,
    });

    try {
      // ========================================================================
      // STEP 1: Register Source
      // ========================================================================
      const sourceHash = this.computeFileHash(input.documentContent);

      const source = await this.provenanceLedger.registerSource({
        source_hash: sourceHash,
        source_type: 'document',
        origin_url: input.documentPath,
        metadata: {
          format: input.metadata?.format || 'text',
          size_bytes:
            input.metadata?.size_bytes || input.documentContent.length,
          ...input.metadata,
        },
        license_id: input.licenseId,
        retention_policy: 'STANDARD',
        created_by: input.userId,
      });

      logger.info({
        message: 'Source registered',
        source_id: source.id,
        source_hash: sourceHash,
      });

      // ========================================================================
      // STEP 2: Extract Text (Transform 1)
      // ========================================================================
      const extractStart = Date.now();
      const extractedText = this.extractText(input.documentContent);
      const extractDuration = Date.now() - extractStart;

      const extractTransform = await this.provenanceLedger.registerTransform({
        transform_type: 'extract',
        input_hash: sourceHash,
        output_hash: this.computeHash(extractedText),
        algorithm: 'text-extractor',
        version: '1.0.0',
        parameters: { method: 'utf8-decode' },
        duration_ms: extractDuration,
        executed_by: 'system',
        confidence: 0.99,
        parent_transforms: [],
      });

      transforms.push(extractTransform);

      logger.info({
        message: 'Text extraction transform registered',
        transform_id: extractTransform.id,
        output_hash: extractTransform.output_hash,
      });

      // ========================================================================
      // STEP 3: Normalize Text (Transform 2)
      // ========================================================================
      const normalizeStart = Date.now();
      const normalizedText = this.normalizeText(extractedText);
      const normalizeDuration = Date.now() - normalizeStart;

      const normalizeTransform =
        await this.provenanceLedger.registerTransform({
          transform_type: 'normalize',
          input_hash: extractTransform.output_hash,
          output_hash: this.computeHash(normalizedText),
          algorithm: 'text-normalizer',
          version: '1.0.0',
          parameters: {
            lowercase: true,
            remove_extra_whitespace: true,
            normalize_unicode: true,
          },
          duration_ms: normalizeDuration,
          executed_by: 'system',
          confidence: 1.0,
          parent_transforms: [extractTransform.id],
        });

      transforms.push(normalizeTransform);

      logger.info({
        message: 'Text normalization transform registered',
        transform_id: normalizeTransform.id,
        output_hash: normalizeTransform.output_hash,
      });

      // ========================================================================
      // STEP 4: Register Evidence
      // ========================================================================
      const evidenceHash = this.computeHash(normalizedText);
      const storageUri = this.generateStorageUri(evidenceHash);

      const evidenceRecord = await this.provenanceLedger.registerEvidence({
        evidence_hash: evidenceHash,
        evidence_type: 'document',
        content_preview: normalizedText.substring(0, 500),
        storage_uri: storageUri,
        source_id: source.id,
        transform_chain: [extractTransform.id, normalizeTransform.id],
        license_id: input.licenseId,
        classification_level: 'INTERNAL',
        registered_by: input.userId,
        metadata: {
          original_path: input.documentPath,
          text_length: normalizedText.length,
        },
      });

      evidence.push(evidenceRecord);

      logger.info({
        message: 'Evidence registered',
        evidence_id: evidenceRecord.id,
        evidence_hash: evidenceHash,
      });

      // ========================================================================
      // STEP 5: Extract Claims
      // ========================================================================
      const extractedClaims = this.extractClaims(normalizedText);

      logger.info({
        message: 'Claims extracted from text',
        claim_count: extractedClaims.length,
      });

      // ========================================================================
      // STEP 6: Register Claims (with Transform 3 for each claim)
      // ========================================================================
      for (const claimText of extractedClaims) {
        const claimTransformStart = Date.now();
        const claimHash = this.computeHash(claimText);
        const claimTransformDuration = Date.now() - claimTransformStart;

        // Register claim extraction transform
        const claimTransform = await this.provenanceLedger.registerTransform({
          transform_type: 'extract_claim',
          input_hash: normalizeTransform.output_hash,
          output_hash: claimHash,
          algorithm: 'nlp-claim-extractor',
          version: '2.0.0',
          parameters: {
            model: 'rule-based-v2',
            min_confidence: 0.7,
          },
          duration_ms: claimTransformDuration,
          executed_by: 'system',
          confidence: 0.85,
          parent_transforms: [normalizeTransform.id],
        });

        transforms.push(claimTransform);

        // Register claim
        const claim = await this.provenanceLedger.registerClaim({
          content: claimText,
          claim_type: this.classifyClaimType(claimText),
          confidence: 0.85,
          evidence_ids: [evidenceRecord.id],
          source_id: source.id,
          transform_chain: [
            extractTransform.id,
            normalizeTransform.id,
            claimTransform.id,
          ],
          created_by: input.userId,
          investigation_id: input.investigationId,
          license_id: input.licenseId,
        });

        claims.push(claim);

        logger.info({
          message: 'Claim registered',
          claim_id: claim.id,
          claim_type: claim.claim_type,
          content_preview: claimText.substring(0, 100),
        });
      }

      // ========================================================================
      // RESULT
      // ========================================================================
      const totalDuration = Date.now() - startTime;

      const result: IngestionResult = {
        source,
        transforms,
        evidence,
        claims,
        provenance_summary: {
          source_hash: sourceHash,
          transform_count: transforms.length,
          evidence_count: evidence.length,
          claim_count: claims.length,
          total_duration_ms: totalDuration,
        },
      };

      logger.info({
        message: 'Document ingestion flow completed',
        source_id: source.id,
        transform_count: transforms.length,
        evidence_count: evidence.length,
        claim_count: claims.length,
        duration_ms: totalDuration,
      });

      return result;
    } catch (error) {
      logger.error({
        message: 'Document ingestion flow failed',
        error: error instanceof Error ? error.message : String(error),
        document_path: input.documentPath,
      });
      throw new Error('Document ingestion failed');
    }
  }

  /**
   * Extract text from document content (simplified)
   */
  private extractText(content: string): string {
    // In a real implementation, this would use libraries like pdfplumber, docx, etc.
    // For now, just return as-is
    return content;
  }

  /**
   * Normalize text
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .normalize('NFC');
  }

  /**
   * Extract claims from text (simplified rule-based extraction)
   */
  private extractClaims(text: string): string[] {
    const claims: string[] = [];

    // Split into sentences
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);

    // Look for assertive patterns
    const assertivePatterns = [
      /\b(is|are|was|were|will be|has been|have been)\b/i,
      /\b(claims?|states?|asserts?|reports?|indicates?|shows?)\b/i,
      /\b(confirms?|proves?|demonstrates?|reveals?)\b/i,
    ];

    for (const sentence of sentences) {
      const trimmed = sentence.trim();

      // Check if sentence contains assertive language
      const isAssertive = assertivePatterns.some((pattern) =>
        pattern.test(trimmed),
      );

      if (isAssertive && trimmed.length > 20 && trimmed.length < 500) {
        claims.push(trimmed);
      }
    }

    // Limit to top 10 claims to avoid overload
    return claims.slice(0, 10);
  }

  /**
   * Classify claim type based on content
   */
  private classifyClaimType(claimText: string): ClaimType {
    const text = claimText.toLowerCase();

    if (
      text.includes('will') ||
      text.includes('predict') ||
      text.includes('forecast')
    ) {
      return 'predictive';
    }

    if (
      text.includes('because') ||
      text.includes('therefore') ||
      text.includes('thus')
    ) {
      return 'inferential';
    }

    if (
      text.includes('good') ||
      text.includes('bad') ||
      text.includes('should') ||
      text.includes('must')
    ) {
      return 'evaluative';
    }

    return 'factual';
  }

  /**
   * Compute hash of file content
   */
  private computeFileHash(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Compute hash of any data
   */
  private computeHash(data: string): string {
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * Generate storage URI for evidence (S3 or similar)
   */
  private generateStorageUri(hash: string): string {
    // In production, this would actually upload to S3 and return the URI
    return `s3://evidence-bucket/documents/${hash.substring(0, 2)}/${hash}.txt`;
  }
}

/**
 * Convenience function for quick document ingestion
 */
export async function ingestDocument(
  input: DocumentIngestionInput,
): Promise<IngestionResult> {
  const flow = new EvidenceRegistrationFlow();
  return flow.ingestDocument(input);
}

export default EvidenceRegistrationFlow;
