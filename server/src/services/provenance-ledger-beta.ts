/**
 * Provenance Ledger Beta Service
 * Unified service for source tracking, transform chains, evidence registration,
 * claim management, and verifiable export manifests with Merkle trees
 */

import crypto from 'crypto';
import { query as timescaleQuery } from '../db/timescale.js';
import logger from '../utils/logger.js';
import {
  MerkleTreeBuilder,
  buildMerkleTreeWithProofs,
  exportMerkleTree,
} from '../utils/merkle-tree.js';
import type {
  Source,
  SourceInput,
  Transform,
  TransformInput,
  Evidence,
  EvidenceInput,
  Claim,
  ClaimInput,
  License,
  LicenseInput,
  ExportManifest,
  ExportManifestInput,
  DisclosureBundle,
  BundleCreateInput,
  ManifestItem,
  ChainOfCustodyEntry,
  ProvenanceChain,
  VerificationReport,
  ItemVerification,
  ChainVerification,
  ProvenanceQueryFilters,
  ClaimQueryFilters,
} from '../types/provenance-beta.js';

export class ProvenanceLedgerBetaService {
  private static instance: ProvenanceLedgerBetaService;
  private signingKey: string;

  private constructor() {
    this.signingKey =
      process.env.LEDGER_SIGNING_KEY || crypto.randomBytes(32).toString('hex');
  }

  public static getInstance(): ProvenanceLedgerBetaService {
    if (!ProvenanceLedgerBetaService.instance) {
      ProvenanceLedgerBetaService.instance =
        new ProvenanceLedgerBetaService();
    }
    return ProvenanceLedgerBetaService.instance;
  }

  // ============================================================================
  // LICENSE MANAGEMENT
  // ============================================================================

  async createLicense(input: LicenseInput): Promise<License> {
    const id = `license-${crypto.randomUUID()}`;
    const now = new Date();

    try {
      await timescaleQuery(
        `
        INSERT INTO licenses (
          id, license_type, license_terms, restrictions,
          attribution_required, expiration_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
        [
          id,
          input.license_type,
          input.license_terms || null,
          input.restrictions || [],
          input.attribution_required ?? true,
          input.expiration_date || null,
          now,
          now,
        ],
      );

      logger.info({
        message: 'License created',
        license_id: id,
        license_type: input.license_type,
      });

      return {
        id,
        ...input,
        restrictions: input.restrictions || [],
        attribution_required: input.attribution_required ?? true,
        created_at: now,
        updated_at: now,
      } as License;
    } catch (error) {
      logger.error({
        message: 'Failed to create license',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('License creation failed');
    }
  }

  async getLicense(licenseId: string): Promise<License | null> {
    const result = await timescaleQuery(
      'SELECT * FROM licenses WHERE id = $1',
      [licenseId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as License;
  }

  // ============================================================================
  // SOURCE MANAGEMENT
  // ============================================================================

  async registerSource(input: SourceInput): Promise<Source> {
    const id = `source-${crypto.randomUUID()}`;
    const now = new Date();

    try {
      await timescaleQuery(
        `
        INSERT INTO sources (
          id, source_hash, source_type, origin_url, ingestion_timestamp,
          metadata, license_id, custody_chain, retention_policy,
          created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
        [
          id,
          input.source_hash,
          input.source_type,
          input.origin_url || null,
          now,
          JSON.stringify(input.metadata || {}),
          input.license_id,
          [input.created_by],
          input.retention_policy || 'STANDARD',
          input.created_by,
          now,
        ],
      );

      // Record in provenance chain
      await this.recordProvenanceEntry({
        operation_type: 'SOURCE_REGISTERED',
        actor_id: input.created_by,
        metadata: {
          source_id: id,
          source_hash: input.source_hash,
          source_type: input.source_type,
        },
      });

      logger.info({
        message: 'Source registered',
        source_id: id,
        source_hash: input.source_hash,
        source_type: input.source_type,
      });

      return {
        id,
        ingestion_timestamp: now,
        custody_chain: [input.created_by],
        created_at: now,
        metadata: input.metadata || {},
        ...input,
      } as Source;
    } catch (error) {
      logger.error({
        message: 'Failed to register source',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Source registration failed');
    }
  }

  async getSource(sourceId: string): Promise<Source | null> {
    const result = await timescaleQuery(
      'SELECT * FROM sources WHERE id = $1',
      [sourceId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      metadata: row.metadata,
    } as Source;
  }

  // ============================================================================
  // TRANSFORM MANAGEMENT
  // ============================================================================

  async registerTransform(input: TransformInput): Promise<Transform> {
    const id = `transform-${crypto.randomUUID()}`;
    const now = new Date();

    try {
      await timescaleQuery(
        `
        INSERT INTO transforms (
          id, transform_type, input_hash, output_hash, algorithm, version,
          parameters, execution_timestamp, duration_ms, executed_by,
          confidence, parent_transforms, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
        [
          id,
          input.transform_type,
          input.input_hash,
          input.output_hash,
          input.algorithm,
          input.version,
          JSON.stringify(input.parameters || {}),
          now,
          input.duration_ms,
          input.executed_by,
          input.confidence || null,
          input.parent_transforms || [],
          now,
        ],
      );

      // Record in provenance chain
      await this.recordProvenanceEntry({
        operation_type: 'TRANSFORM_EXECUTED',
        actor_id: input.executed_by,
        metadata: {
          transform_id: id,
          transform_type: input.transform_type,
          algorithm: input.algorithm,
          input_hash: input.input_hash,
          output_hash: input.output_hash,
        },
      });

      logger.info({
        message: 'Transform registered',
        transform_id: id,
        transform_type: input.transform_type,
        algorithm: input.algorithm,
      });

      return {
        id,
        execution_timestamp: now,
        parameters: input.parameters || {},
        parent_transforms: input.parent_transforms || [],
        created_at: now,
        ...input,
      } as Transform;
    } catch (error) {
      logger.error({
        message: 'Failed to register transform',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Transform registration failed');
    }
  }

  async getTransform(transformId: string): Promise<Transform | null> {
    const result = await timescaleQuery(
      'SELECT * FROM transforms WHERE id = $1',
      [transformId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as Transform;
  }

  async getTransformChain(transformIds: string[]): Promise<Transform[]> {
    if (transformIds.length === 0) {
      return [];
    }

    const placeholders = transformIds.map((_, i) => `$${i + 1}`).join(', ');
    const result = await timescaleQuery(
      `SELECT * FROM transforms WHERE id IN (${placeholders}) ORDER BY execution_timestamp ASC`,
      transformIds,
    );

    return result.rows as Transform[];
  }

  // ============================================================================
  // EVIDENCE MANAGEMENT
  // ============================================================================

  async registerEvidence(input: EvidenceInput): Promise<Evidence> {
    const id = `evidence-${crypto.randomUUID()}`;
    const now = new Date();

    try {
      await timescaleQuery(
        `
        INSERT INTO evidence_artifacts (
          id, sha256, artifact_type, storage_uri, source_id, transform_chain,
          license_id, classification_level, content_preview, registered_by,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
        [
          id,
          input.evidence_hash,
          input.evidence_type,
          input.storage_uri,
          input.source_id,
          input.transform_chain,
          input.license_id,
          input.classification_level || 'INTERNAL',
          input.content_preview || null,
          input.registered_by,
          now,
        ],
      );

      // Record in provenance chain
      await this.recordProvenanceEntry({
        operation_type: 'EVIDENCE_REGISTERED',
        actor_id: input.registered_by,
        metadata: {
          evidence_id: id,
          evidence_hash: input.evidence_hash,
          evidence_type: input.evidence_type,
          source_id: input.source_id,
          transform_count: input.transform_chain.length,
        },
      });

      logger.info({
        message: 'Evidence registered',
        evidence_id: id,
        evidence_hash: input.evidence_hash,
        source_id: input.source_id,
      });

      return {
        id,
        collected_at: now,
        classification_level: input.classification_level || 'INTERNAL',
        metadata: input.metadata || {},
        ...input,
      } as Evidence;
    } catch (error) {
      logger.error({
        message: 'Failed to register evidence',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Evidence registration failed');
    }
  }

  async getEvidence(evidenceId: string): Promise<Evidence | null> {
    const result = await timescaleQuery(
      'SELECT * FROM evidence_artifacts WHERE id = $1',
      [evidenceId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as Evidence;
  }

  // ============================================================================
  // CLAIM MANAGEMENT
  // ============================================================================

  async registerClaim(input: ClaimInput): Promise<Claim> {
    const id = `claim-${crypto.randomUUID()}`;
    const content_hash = this.computeHash(input.content);
    const now = new Date();

    try {
      await timescaleQuery(
        `
        INSERT INTO claims_registry (
          id, content_hash, content, claim_type, confidence, evidence_hashes,
          created_at, created_by, investigation_id, source_id, transform_chain,
          license_id, contradicts, corroborates, extracted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `,
        [
          id,
          content_hash,
          input.content,
          input.claim_type,
          input.confidence,
          JSON.stringify(input.evidence_ids),
          now,
          input.created_by,
          input.investigation_id || null,
          input.source_id,
          input.transform_chain,
          input.license_id,
          input.contradicts || [],
          input.corroborates || [],
          now,
        ],
      );

      // Record in provenance chain
      await this.recordProvenanceEntry({
        operation_type: 'CLAIM_REGISTERED',
        actor_id: input.created_by,
        metadata: {
          claim_id: id,
          content_hash,
          claim_type: input.claim_type,
          confidence: input.confidence,
          evidence_count: input.evidence_ids.length,
        },
      });

      logger.info({
        message: 'Claim registered',
        claim_id: id,
        content_hash,
        claim_type: input.claim_type,
      });

      return {
        id,
        content_hash,
        extracted_at: now,
        created_at: now,
        evidence_ids: input.evidence_ids,
        contradicts: input.contradicts || [],
        corroborates: input.corroborates || [],
        ...input,
      } as Claim;
    } catch (error) {
      logger.error({
        message: 'Failed to register claim',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Claim registration failed');
    }
  }

  async getClaim(claimId: string): Promise<Claim | null> {
    const result = await timescaleQuery(
      'SELECT * FROM claims_registry WHERE id = $1',
      [claimId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      evidence_ids: Array.isArray(row.evidence_hashes)
        ? row.evidence_hashes
        : JSON.parse(row.evidence_hashes || '[]'),
    } as Claim;
  }

  async queryClaims(filters: ClaimQueryFilters): Promise<Claim[]> {
    let whereClause = '1=1';
    const params: any[] = [];

    if (filters.investigation_id) {
      params.push(filters.investigation_id);
      whereClause += ` AND investigation_id = $${params.length}`;
    }

    if (filters.created_by) {
      params.push(filters.created_by);
      whereClause += ` AND created_by = $${params.length}`;
    }

    if (filters.claim_type) {
      params.push(filters.claim_type);
      whereClause += ` AND claim_type = $${params.length}`;
    }

    if (filters.confidence_min !== undefined) {
      params.push(filters.confidence_min);
      whereClause += ` AND confidence >= $${params.length}`;
    }

    if (filters.confidence_max !== undefined) {
      params.push(filters.confidence_max);
      whereClause += ` AND confidence <= $${params.length}`;
    }

    if (filters.source_id) {
      params.push(filters.source_id);
      whereClause += ` AND source_id = $${params.length}`;
    }

    if (filters.time_range) {
      params.push(filters.time_range.start, filters.time_range.end);
      whereClause += ` AND created_at BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    const result = await timescaleQuery(
      `SELECT * FROM claims_registry WHERE ${whereClause} ORDER BY created_at DESC LIMIT 1000`,
      params,
    );

    return result.rows.map((row) => ({
      ...row,
      evidence_ids: Array.isArray(row.evidence_hashes)
        ? row.evidence_hashes
        : JSON.parse(row.evidence_hashes || '[]'),
    })) as Claim[];
  }

  // ============================================================================
  // PROVENANCE CHAIN
  // ============================================================================

  private async recordProvenanceEntry(entry: {
    operation_type: string;
    actor_id: string;
    metadata: Record<string, any>;
    parent_hash?: string;
  }): Promise<string> {
    const id = crypto.randomUUID();
    const timestamp = new Date();
    const content_hash = this.computeHash({ ...entry, timestamp });
    const signature = this.generateSignature({
      id,
      content_hash,
      ...entry,
      timestamp,
    });

    await timescaleQuery(
      `
      INSERT INTO provenance_chain (
        id, parent_hash, content_hash, operation_type, actor_id,
        timestamp, metadata, signature
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [
        id,
        entry.parent_hash || null,
        content_hash,
        entry.operation_type,
        entry.actor_id,
        timestamp,
        JSON.stringify(entry.metadata),
        signature,
      ],
    );

    return id;
  }

  async getProvenanceChain(itemId: string): Promise<ProvenanceChain> {
    // Determine item type
    const claim = await this.getClaim(itemId);

    if (claim) {
      const source = claim.source_id ? await this.getSource(claim.source_id) : undefined;
      const transforms = await this.getTransformChain(claim.transform_chain);
      const evidence = await Promise.all(
        claim.evidence_ids.map((id) => this.getEvidence(id)),
      );
      const licenses = await Promise.all([
        claim.license_id ? this.getLicense(claim.license_id) : null,
        source?.license_id ? this.getLicense(source.license_id) : null,
      ]);

      return {
        item_id: itemId,
        item_type: 'claim',
        claim,
        source,
        transforms,
        evidence: evidence.filter((e) => e !== null) as Evidence[],
        licenses: licenses.filter((l) => l !== null) as License[],
        custody_chain: source?.custody_chain || [],
      };
    }

    // Could extend to other item types (evidence, source, etc.)
    throw new Error(`Item ${itemId} not found or unsupported type`);
  }

  // ============================================================================
  // EXPORT MANIFESTS
  // ============================================================================

  async createExportManifest(
    bundleInput: BundleCreateInput,
  ): Promise<ExportManifest> {
    const manifest_id = `manifest-${crypto.randomUUID()}`;
    const bundle_id = `bundle-${crypto.randomUUID()}`;
    const now = new Date();

    // 1. Gather all items
    let claims: Claim[] = [];

    if (bundleInput.claim_ids && bundleInput.claim_ids.length > 0) {
      claims = await Promise.all(
        bundleInput.claim_ids.map((id) => this.getClaim(id)),
      ).then((results) => results.filter((c) => c !== null) as Claim[]);
    } else if (bundleInput.investigation_id) {
      claims = await this.queryClaims({
        investigation_id: bundleInput.investigation_id,
      });
    }

    // 2. Gather evidence, sources, transforms
    const evidenceIds = [...new Set(claims.flatMap((c) => c.evidence_ids))];
    const evidence = await Promise.all(
      evidenceIds.map((id) => this.getEvidence(id)),
    ).then((results) => results.filter((e) => e !== null) as Evidence[]);

    const sourceIds = [
      ...new Set([
        ...claims.map((c) => c.source_id),
        ...evidence.map((e) => e.source_id),
      ]),
    ];
    const sources = await Promise.all(
      sourceIds.map((id) => this.getSource(id)),
    ).then((results) => results.filter((s) => s !== null) as Source[]);

    const transformIds = [
      ...new Set([
        ...claims.flatMap((c) => c.transform_chain),
        ...evidence.flatMap((e) => e.transform_chain),
      ]),
    ];
    const transforms = await this.getTransformChain(transformIds);

    // 3. Build manifest items
    const items: ManifestItem[] = [
      ...claims.map((c) => ({
        id: c.id,
        item_type: 'claim' as const,
        content_hash: c.content_hash,
        merkle_proof: [],
        source_id: c.source_id,
        transform_chain: c.transform_chain,
        license_id: c.license_id,
      })),
      ...evidence.map((e) => ({
        id: e.id,
        item_type: 'evidence' as const,
        content_hash: e.evidence_hash,
        merkle_proof: [],
        source_id: e.source_id,
        transform_chain: e.transform_chain,
        license_id: e.license_id,
      })),
      ...sources.map((s) => ({
        id: s.id,
        item_type: 'source' as const,
        content_hash: s.source_hash,
        merkle_proof: [],
        transform_chain: [],
        license_id: s.license_id,
      })),
      ...transforms.map((t) => ({
        id: t.id,
        item_type: 'transform' as const,
        content_hash: this.computeHash(t),
        merkle_proof: [],
        transform_chain: t.parent_transforms,
        license_id: '',
      })),
    ];

    // 4. Build Merkle tree
    const { root, proofs } = buildMerkleTreeWithProofs(items);

    // Add proofs to items
    items.forEach((item) => {
      item.merkle_proof = proofs.get(item.content_hash) || [];
    });

    // 5. Collect licenses
    const licenseIds = [...new Set(items.map((i) => i.license_id).filter(Boolean))];
    const licenses = await Promise.all(
      licenseIds.map((id) => this.getLicense(id)),
    ).then((results) => results.filter((l) => l !== null) as License[]);

    // 6. Create chain of custody
    const custody_chain: ChainOfCustodyEntry[] = [
      {
        actor_id: bundleInput.created_by,
        action: 'EXPORT_CREATED',
        timestamp: now,
        signature: '',
        justification: `Export for ${bundleInput.export_type}`,
      },
    ];

    // 7. Create manifest
    const manifest: ExportManifest = {
      manifest_id,
      manifest_version: '1.0.0',
      created_at: now,
      created_by: bundleInput.created_by,
      bundle_id,
      merkle_root: root,
      hash_algorithm: 'SHA-256',
      items,
      custody_chain,
      export_type: bundleInput.export_type,
      classification_level: bundleInput.classification_level,
      retention_policy: 'REGULATORY_STANDARD',
      signature: '',
      public_key_id: '',
      licenses,
      data_sources: sourceIds,
      transformation_chain: transformIds,
      authority_basis: bundleInput.authority_basis || [],
    };

    // 8. Sign manifest
    const signature = this.generateSignature(manifest);
    manifest.signature = signature;
    manifest.public_key_id = 'default-key';

    // 9. Store manifest
    try {
      await timescaleQuery(
        `
        INSERT INTO export_manifests (
          manifest_id, manifest_version, bundle_id, merkle_root, hash_algorithm,
          export_type, data_sources, transformation_chain, authority_basis,
          classification_level, retention_policy, chain_of_custody,
          signature, public_key_id, items, licenses, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `,
        [
          manifest_id,
          manifest.manifest_version,
          bundle_id,
          root,
          manifest.hash_algorithm,
          manifest.export_type,
          JSON.stringify(manifest.data_sources),
          JSON.stringify(manifest.transformation_chain),
          JSON.stringify(manifest.authority_basis),
          manifest.classification_level,
          manifest.retention_policy,
          JSON.stringify(custody_chain),
          signature,
          manifest.public_key_id,
          JSON.stringify(items),
          JSON.stringify(licenses),
          bundleInput.created_by,
        ],
      );

      // Record in provenance chain
      await this.recordProvenanceEntry({
        operation_type: 'EXPORT_MANIFEST_CREATED',
        actor_id: bundleInput.created_by,
        metadata: {
          manifest_id,
          bundle_id,
          merkle_root: root,
          item_count: items.length,
        },
      });

      logger.info({
        message: 'Export manifest created',
        manifest_id,
        bundle_id,
        merkle_root: root,
        item_count: items.length,
      });

      return manifest;
    } catch (error) {
      logger.error({
        message: 'Failed to create export manifest',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Export manifest creation failed');
    }
  }

  async verifyManifest(manifestId: string): Promise<VerificationReport> {
    const result = await timescaleQuery(
      'SELECT * FROM export_manifests WHERE manifest_id = $1',
      [manifestId],
    );

    if (result.rows.length === 0) {
      throw new Error(`Manifest ${manifestId} not found`);
    }

    const row = result.rows[0];
    const manifest: ExportManifest = {
      ...row,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      licenses: typeof row.licenses === 'string' ? JSON.parse(row.licenses) : row.licenses,
      custody_chain: typeof row.chain_of_custody === 'string' ? JSON.parse(row.chain_of_custody) : row.chain_of_custody,
    };

    // 1. Verify signature
    const expectedSignature = this.generateSignature({
      ...manifest,
      signature: '',
      public_key_id: '',
    });
    const signature_valid = manifest.signature === expectedSignature;

    // 2. Verify Merkle root
    const recomputedRoot = MerkleTreeBuilder.buildFromItems(manifest.items).root;
    const merkle_valid = recomputedRoot === manifest.merkle_root;

    // 3. Verify each item's proof
    const item_verifications: ItemVerification[] = manifest.items.map(
      (item) => {
        const valid = MerkleTreeBuilder.verifyProof(
          item.content_hash,
          item.merkle_proof,
          manifest.merkle_root,
        );

        return {
          item_id: item.id,
          item_type: item.item_type,
          valid,
          error: valid ? undefined : 'Merkle proof verification failed',
        };
      },
    );

    // 4. Verify transform chains
    const chain_verifications: ChainVerification[] = [];
    // Simplified - could be expanded to verify each claim's transform chain

    // 5. Check license conflicts
    const license_issues: string[] = [];
    // Simplified - could check for conflicting license terms

    const bundle_valid =
      signature_valid &&
      merkle_valid &&
      item_verifications.every((v) => v.valid);

    const report: VerificationReport = {
      manifest_id: manifestId,
      bundle_valid,
      signature_valid,
      merkle_valid,
      item_verifications,
      chain_verifications,
      license_issues,
      verified_at: new Date(),
    };

    // Store verification log
    await timescaleQuery(
      `
      INSERT INTO verification_logs (
        id, manifest_id, verified_at, bundle_valid, signature_valid,
        merkle_valid, items_valid, items_total, verification_details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
      [
        `verify-${crypto.randomUUID()}`,
        manifestId,
        report.verified_at,
        bundle_valid,
        signature_valid,
        merkle_valid,
        item_verifications.filter((v) => v.valid).length,
        item_verifications.length,
        JSON.stringify(report),
      ],
    );

    return report;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private computeHash(data: any): string {
    const normalized =
      typeof data === 'string' ? data : JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
  }

  private generateSignature(data: any): string {
    const content =
      typeof data === 'string' ? data : JSON.stringify(data, Object.keys(data).sort());
    const hmac = crypto.createHmac('sha256', this.signingKey);
    return hmac.update(content).digest('hex');
  }
}

export default ProvenanceLedgerBetaService;
