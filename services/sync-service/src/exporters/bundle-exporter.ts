import { Pool } from 'pg';
import {
  ExportRequest,
  ExportResult,
  SyncBundle,
  BundleContent,
  BundleChecksum,
  generateBundleId,
  computeChecksum,
} from '../types/index.js';
import { BundleSigner } from '../crypto/signer.js';

export interface ExporterConfig {
  pgPool: Pool;
  signer: BundleSigner;
  deploymentId: string;
  deploymentName: string;
  environment: 'core' | 'edge';
  classification: string;
}

export class BundleExporter {
  private pool: Pool;
  private signer: BundleSigner;
  private config: ExporterConfig;

  constructor(config: ExporterConfig) {
    this.pool = config.pgPool;
    this.signer = config.signer;
    this.config = config;
  }

  /**
   * Export data bundle based on scope
   */
  async exportBundle(request: ExportRequest): Promise<ExportResult> {
    const bundleId = generateBundleId();
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate request
      const validationErrors = this.validateExportRequest(request);
      if (validationErrors.length > 0) {
        return {
          success: false,
          bundleId,
          manifest: this.createManifest(bundleId, request, new Date()),
          statistics: this.createEmptyStatistics(),
          checksums: this.createEmptyChecksums(),
          signatures: [],
          errors: validationErrors,
          warnings: [],
          exportedAt: new Date().toISOString(),
        };
      }

      // Extract data based on scope
      const content = await this.extractContent(request, errors, warnings);

      // Create manifest
      const expiresAt = new Date(Date.now() + request.expiresIn * 1000);
      const manifest = this.createManifest(bundleId, request, expiresAt);

      // Compute checksums
      const checksums = this.computeBundleChecksums(manifest, content);

      // Create unsigned bundle
      const unsignedBundle: Omit<SyncBundle, 'signatures'> = {
        manifest,
        content,
        checksums,
        encryptionMetadata: request.encrypt
          ? {
              encrypted: true,
              algorithm: 'AES-256-GCM',
              keyId: 'default',
            }
          : undefined,
      };

      // Sign bundle
      const signature = await this.signer.signBundle(
        unsignedBundle,
        request.requester,
      );

      const bundle: SyncBundle = {
        ...unsignedBundle,
        signatures: [signature],
      };

      // Compute statistics
      const statistics = {
        casesExported: content.cases.length,
        entitiesExported: content.entities.length,
        relationshipsExported: content.relationships.length,
        evidenceExported: content.evidence.length,
        totalSize: JSON.stringify(bundle).length,
      };

      // Audit the export
      await this.auditExport(bundleId, request, statistics, errors);

      const endTime = Date.now();
      console.log(
        `Bundle ${bundleId} exported in ${endTime - startTime}ms: ${statistics.casesExported} cases, ${statistics.entitiesExported} entities, ${statistics.relationshipsExported} relationships, ${statistics.evidenceExported} evidence`,
      );

      return {
        success: errors.length === 0,
        bundleId,
        bundlePath: request.dryRun ? undefined : `/bundles/${bundleId}.json`,
        manifest,
        statistics,
        checksums,
        signatures: bundle.signatures,
        errors,
        warnings,
        exportedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error(`Bundle export failed for ${bundleId}:`, error);
      errors.push(`Export failed: ${error.message}`);

      return {
        success: false,
        bundleId,
        manifest: this.createManifest(bundleId, request, new Date()),
        statistics: this.createEmptyStatistics(),
        checksums: this.createEmptyChecksums(),
        signatures: [],
        errors,
        warnings,
        exportedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Validate export request
   */
  private validateExportRequest(request: ExportRequest): string[] {
    const errors: string[] = [];

    // Validate scope
    if (
      !request.scope.cases &&
      !request.scope.tenants &&
      !request.scope.timeRange &&
      !request.scope.entities
    ) {
      errors.push(
        'Export scope must specify at least one of: cases, tenants, timeRange, or entities',
      );
    }

    // Validate time range if provided
    if (request.scope.timeRange) {
      const start = new Date(request.scope.timeRange.start);
      const end = new Date(request.scope.timeRange.end);

      if (start >= end) {
        errors.push('Time range start must be before end');
      }

      const maxRange = 90 * 24 * 60 * 60 * 1000; // 90 days
      if (end.getTime() - start.getTime() > maxRange) {
        errors.push('Time range cannot exceed 90 days');
      }
    }

    // Validate requester
    if (!request.requester || request.requester.trim().length === 0) {
      errors.push('Requester is required');
    }

    // Validate reason
    if (!request.reason || request.reason.trim().length < 10) {
      errors.push('Reason must be at least 10 characters');
    }

    return errors;
  }

  /**
   * Extract content based on scope
   */
  private async extractContent(
    request: ExportRequest,
    errors: string[],
    warnings: string[],
  ): Promise<BundleContent> {
    const content: BundleContent = {
      cases: [],
      entities: [],
      relationships: [],
      evidence: [],
      analytics: [],
      provenance: [],
      auditRecords: [],
    };

    try {
      // Extract cases
      if (request.scope.cases && request.scope.cases.length > 0) {
        content.cases = await this.extractCases(request.scope.cases);
      } else if (request.scope.tenants) {
        content.cases = await this.extractCasesByTenants(
          request.scope.tenants,
        );
      } else if (request.scope.timeRange) {
        content.cases = await this.extractCasesByTimeRange(
          request.scope.timeRange.start,
          request.scope.timeRange.end,
        );
      }

      // Extract entities (either scoped or related to cases)
      if (request.scope.entities && request.scope.entities.length > 0) {
        content.entities = await this.extractEntities(request.scope.entities);
      } else if (content.cases.length > 0) {
        const caseIds = content.cases.map((c) => c.id);
        content.entities = await this.extractEntitiesByCases(caseIds);
      }

      // Extract relationships
      if (
        request.scope.relationships &&
        request.scope.relationships.length > 0
      ) {
        content.relationships = await this.extractRelationships(
          request.scope.relationships,
        );
      } else if (content.entities.length > 0) {
        const entityIds = content.entities.map((e) => e.id);
        content.relationships =
          await this.extractRelationshipsByEntities(entityIds);
      }

      // Extract evidence if requested
      if (request.scope.includeEvidence && content.cases.length > 0) {
        const caseIds = content.cases.map((c) => c.id);
        content.evidence = await this.extractEvidenceByCases(caseIds);
        content.provenance = await this.extractProvenanceByCases(caseIds);
      }

      // Extract analytics if requested
      if (request.scope.includeAnalytics && content.cases.length > 0) {
        const caseIds = content.cases.map((c) => c.id);
        content.analytics = await this.extractAnalyticsByCases(caseIds);
      }

      // Extract audit records
      if (content.cases.length > 0) {
        const caseIds = content.cases.map((c) => c.id);
        content.auditRecords = await this.extractAuditRecordsByCases(caseIds);
      }

      // Check if any data was extracted
      const totalItems =
        content.cases.length +
        content.entities.length +
        content.relationships.length +
        content.evidence.length +
        content.analytics.length;

      if (totalItems === 0) {
        warnings.push('No data matched the export scope criteria');
      }
    } catch (error: any) {
      errors.push(`Content extraction failed: ${error.message}`);
      console.error('Content extraction error:', error);
    }

    return content;
  }

  /**
   * Database extraction methods
   */
  private async extractCases(caseIds: string[]): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM cases WHERE id = ANY($1) ORDER BY created_at',
      [caseIds],
    );
    return result.rows;
  }

  private async extractCasesByTenants(tenantIds: string[]): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM cases WHERE tenant_id = ANY($1) ORDER BY created_at',
      [tenantIds],
    );
    return result.rows;
  }

  private async extractCasesByTimeRange(
    start: string,
    end: string,
  ): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM cases WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at',
      [start, end],
    );
    return result.rows;
  }

  private async extractEntities(entityIds: string[]): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM entities WHERE id = ANY($1) ORDER BY created_at',
      [entityIds],
    );
    return result.rows;
  }

  private async extractEntitiesByCases(caseIds: string[]): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT DISTINCT e.* FROM entities e
       INNER JOIN case_entities ce ON e.id = ce.entity_id
       WHERE ce.case_id = ANY($1)
       ORDER BY e.created_at`,
      [caseIds],
    );
    return result.rows;
  }

  private async extractRelationships(relationshipIds: string[]): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM relationships WHERE id = ANY($1) ORDER BY created_at',
      [relationshipIds],
    );
    return result.rows;
  }

  private async extractRelationshipsByEntities(
    entityIds: string[],
  ): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT * FROM relationships
       WHERE source_id = ANY($1) OR target_id = ANY($1)
       ORDER BY created_at`,
      [entityIds],
    );
    return result.rows;
  }

  private async extractEvidenceByCases(caseIds: string[]): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT e.* FROM evidence e
       INNER JOIN case_evidence ce ON e.id = ce.evidence_id
       WHERE ce.case_id = ANY($1)
       ORDER BY e.created_at`,
      [caseIds],
    );
    return result.rows;
  }

  private async extractProvenanceByCases(caseIds: string[]): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT pc.* FROM provenance_chains pc
       INNER JOIN evidence e ON pc.claim_id = e.id
       INNER JOIN case_evidence ce ON e.id = ce.evidence_id
       WHERE ce.case_id = ANY($1)
       ORDER BY pc.created_at`,
      [caseIds],
    );
    return result.rows;
  }

  private async extractAnalyticsByCases(caseIds: string[]): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT * FROM analytics
       WHERE case_id = ANY($1)
       ORDER BY created_at`,
      [caseIds],
    );
    return result.rows;
  }

  private async extractAuditRecordsByCases(caseIds: string[]): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT * FROM audit_records
       WHERE resource = 'case' AND resource_id = ANY($1)
       ORDER BY timestamp`,
      [caseIds],
    );
    return result.rows;
  }

  /**
   * Create bundle manifest
   */
  private createManifest(
    bundleId: string,
    request: ExportRequest,
    expiresAt: Date,
  ) {
    return {
      id: bundleId,
      version: '1.0',
      direction: request.direction,
      scope: request.scope,
      sourceDeployment: {
        id: this.config.deploymentId,
        name: this.config.deploymentName,
        environment: this.config.environment,
        classification: this.config.classification,
      },
      targetDeployment: request.targetDeployment
        ? {
            id: request.targetDeployment,
            name: request.targetDeployment,
            environment:
              this.config.environment === 'core' ? 'edge' : 'core',
            classification: this.config.classification,
          }
        : undefined,
      createdAt: new Date().toISOString(),
      createdBy: request.requester,
      expiresAt: expiresAt.toISOString(),
      metadata: {
        reason: request.reason,
        dryRun: request.dryRun,
      },
    };
  }

  /**
   * Compute bundle checksums
   */
  private computeBundleChecksums(
    manifest: any,
    content: BundleContent,
  ): BundleChecksum {
    return {
      manifest: computeChecksum(manifest),
      content: computeChecksum(content),
      overall: computeChecksum({ manifest, content }),
      algorithm: 'sha256',
    };
  }

  /**
   * Audit export operation
   */
  private async auditExport(
    bundleId: string,
    request: ExportRequest,
    statistics: any,
    errors: string[],
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO sync_audit_log
         (bundle_id, operation, actor, source_deployment, scope, result, statistics, errors, reason, classification, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          bundleId,
          'export',
          request.requester,
          this.config.deploymentId,
          JSON.stringify(request.scope),
          errors.length === 0 ? 'success' : 'failure',
          JSON.stringify(statistics),
          JSON.stringify(errors),
          request.reason,
          this.config.classification,
        ],
      );
    } catch (error) {
      console.error('Failed to audit export:', error);
    }
  }

  /**
   * Helper methods
   */
  private createEmptyStatistics() {
    return {
      casesExported: 0,
      entitiesExported: 0,
      relationshipsExported: 0,
      evidenceExported: 0,
      totalSize: 0,
    };
  }

  private createEmptyChecksums(): BundleChecksum {
    return {
      manifest: '',
      content: '',
      overall: '',
      algorithm: 'sha256',
    };
  }
}
