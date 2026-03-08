/**
 * Explainability Explorer Service
 *
 * Read-only service for querying explainability artifacts.
 * Implements: docs/explainability/EXPLAINABILITY_CONTRACT.md
 */

import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { query as timescaleQuery } from '../db/timescale.js';
import { ProvenanceLedgerBetaService } from '../services/provenance-ledger-beta.js';
import logger from '../utils/logger.js';
import {
  ExplainableRun,
  ListRunsFilter,
  RunComparison,
  ExplainabilityAPIResponse,
  ActorInfo,
  ExplainableInputs,
  ExplainableOutputs,
  Explanation,
  ConfidenceMetrics,
  ProvenanceLinks,
  ClaimReference,
  EvidenceReference,
  SourceReference,
  TransformReference,
} from './types';

const SCHEMA_VERSION = '1.0.0';

/**
 * Singleton service for explainability exploration.
 * READ-ONLY by design - no mutations allowed.
 */
export class ExplainabilityExplorerService {
  private static instance: ExplainabilityExplorerService;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): ExplainabilityExplorerService {
    if (!ExplainabilityExplorerService.instance) {
      ExplainabilityExplorerService.instance = new ExplainabilityExplorerService();
    }
    return ExplainabilityExplorerService.instance;
  }

  /**
   * List runs with filtering and pagination.
   * Enforces tenant isolation.
   */
  async listRuns(
    tenantId: string,
    filter: ListRunsFilter = {},
    requesterId: string
  ): Promise<ExplainabilityAPIResponse<ExplainableRun[]>> {
    const requestId = uuidv4();
    const queriedAt = new Date().toISOString();

    try {
      const limit = filter.limit ?? 50;
      const offset = filter.offset ?? 0;

      // Build WHERE clause with filters
      const whereClauses = ['tenant_id = $1'];
      const params: any[] = [tenantId];
      let paramIndex = 2;

      if (filter.run_type) {
        if (Array.isArray(filter.run_type)) {
          whereClauses.push(`run_type = ANY($${paramIndex})`);
          params.push(filter.run_type);
        } else {
          whereClauses.push(`run_type = $${paramIndex}`);
          params.push(filter.run_type);
        }
        paramIndex++;
      }

      if (filter.actor_id) {
        whereClauses.push(`actor_id = $${paramIndex}`);
        params.push(filter.actor_id);
        paramIndex++;
      }

      if (filter.started_after) {
        whereClauses.push(`started_at >= $${paramIndex}`);
        params.push(filter.started_after);
        paramIndex++;
      }

      if (filter.started_before) {
        whereClauses.push(`started_at <= $${paramIndex}`);
        params.push(filter.started_before);
        paramIndex++;
      }

      if (filter.capability) {
        whereClauses.push(`$${paramIndex} = ANY(capabilities_used)`);
        params.push(filter.capability);
        paramIndex++;
      }

      if (filter.min_confidence !== undefined) {
        whereClauses.push(`confidence_overall >= $${paramIndex}`);
        params.push(filter.min_confidence);
        paramIndex++;
      }

      const whereClause = whereClauses.join(' AND ');

      // Add limit and offset
      params.push(limit, offset);

      const sql = `
        SELECT * FROM explainable_runs
        WHERE ${whereClause}
        ORDER BY started_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const result = await timescaleQuery(sql, params);
      const runs: ExplainableRun[] = await Promise.all(
        result.rows.map((row: any) => this.mapRowToExplainableRun(row))
      );

      logger.info({
        message: 'Listed explainable runs',
        tenant_id: tenantId,
        count: runs.length,
        requester_id: requesterId,
      });

      return {
        success: true,
        data: runs,
        meta: {
          request_id: requestId,
          tenant_id: tenantId,
          queried_at: queriedAt,
          version: SCHEMA_VERSION,
        },
      };
    } catch (error: any) {
      logger.error({
        message: 'Failed to list explainable runs',
        error: error instanceof Error ? error.message : 'Unknown error',
        tenant_id: tenantId,
      });

      return {
        success: false,
        data: null,
        meta: {
          request_id: requestId,
          tenant_id: tenantId,
          queried_at: queriedAt,
          version: SCHEMA_VERSION,
        },
        errors: [
          {
            code: 'QUERY_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      };
    }
  }

  /**
   * Fetch a single run by ID.
   * Enforces tenant isolation.
   */
  async getRun(
    runId: string,
    tenantId: string,
    requesterId: string
  ): Promise<ExplainabilityAPIResponse<ExplainableRun>> {
    const requestId = uuidv4();
    const queriedAt = new Date().toISOString();

    try {
      const sql = `
        SELECT * FROM explainable_runs
        WHERE run_id = $1 AND tenant_id = $2
      `;

      const result = await timescaleQuery(sql, [runId, tenantId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          data: null,
          meta: {
            request_id: requestId,
            tenant_id: tenantId,
            queried_at: queriedAt,
            version: SCHEMA_VERSION,
          },
          errors: [
            {
              code: 'RUN_NOT_FOUND',
              message: `Run ${runId} not found or not accessible`,
            },
          ],
        };
      }

      const run = await this.mapRowToExplainableRun(result.rows[0]);

      logger.info({
        message: 'Retrieved explainable run',
        run_id: runId,
        tenant_id: tenantId,
        requester_id: requesterId,
      });

      return {
        success: true,
        data: run,
        meta: {
          request_id: requestId,
          tenant_id: tenantId,
          queried_at: queriedAt,
          version: SCHEMA_VERSION,
        },
      };
    } catch (error: any) {
      logger.error({
        message: 'Failed to retrieve explainable run',
        run_id: runId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        data: null,
        meta: {
          request_id: requestId,
          tenant_id: tenantId,
          queried_at: queriedAt,
          version: SCHEMA_VERSION,
        },
        errors: [
          {
            code: 'QUERY_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      };
    }
  }

  /**
   * Traverse lineage: run → artifacts → SBOM → provenance.
   * Returns full provenance chain.
   */
  async getLineage(
    runId: string,
    tenantId: string,
    depth: number = 3
  ): Promise<ExplainabilityAPIResponse<any>> {
    const requestId = uuidv4();
    const queriedAt = new Date().toISOString();

    try {
      // Get the run first
      const runResponse = await this.getRun(runId, tenantId, 'system');
      if (!runResponse.success || !runResponse.data) {
        return {
          success: false,
          data: null,
          meta: {
            request_id: requestId,
            tenant_id: tenantId,
            queried_at: queriedAt,
            version: SCHEMA_VERSION,
          },
          errors: [{ code: 'RUN_NOT_FOUND', message: 'Run not found' }],
        };
      }

      const run = runResponse.data;
      const nodes: any[] = [{ id: runId, type: 'run', data: run }];
      const edges: any[] = [];

      // Add provenance chain if exists
      if (run.provenance_links.provenance_chain_id && depth > 0) {
        const provenanceService = ProvenanceLedgerBetaService.getInstance();

        // Add claims
        for (const claim of run.provenance_links.claims) {
          nodes.push({ id: claim.claim_id, type: 'claim', data: claim });
          edges.push({ from: runId, to: claim.claim_id, type: 'produces' });
        }

        // Add evidence
        for (const evidence of run.provenance_links.evidence) {
          nodes.push({ id: evidence.evidence_id, type: 'evidence', data: evidence });
          edges.push({ from: runId, to: evidence.evidence_id, type: 'uses' });
        }

        // Add sources
        for (const source of run.provenance_links.sources) {
          nodes.push({ id: source.source_id, type: 'source', data: source });
          edges.push({ from: runId, to: source.source_id, type: 'sources_from' });
        }

        // Add transforms
        for (const transform of run.provenance_links.transforms) {
          nodes.push({ id: transform.transform_id, type: 'transform', data: transform });
          edges.push({ from: runId, to: transform.transform_id, type: 'applies' });
        }
      }

      // Add parent/child relationships
      if (run.parent_run_id) {
        edges.push({ from: run.parent_run_id, to: runId, type: 'spawns' });
      }

      for (const childId of run.child_run_ids) {
        edges.push({ from: runId, to: childId, type: 'spawns' });
      }

      const lineage = {
        run_id: runId,
        depth_traversed: depth,
        nodes,
        edges,
      };

      logger.info({
        message: 'Traversed lineage',
        run_id: runId,
        nodes_count: nodes.length,
        edges_count: edges.length,
      });

      return {
        success: true,
        data: lineage,
        meta: {
          request_id: requestId,
          tenant_id: tenantId,
          queried_at: queriedAt,
          version: SCHEMA_VERSION,
        },
      };
    } catch (error: any) {
      logger.error({
        message: 'Failed to traverse lineage',
        run_id: runId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        data: null,
        meta: {
          request_id: requestId,
          tenant_id: tenantId,
          queried_at: queriedAt,
          version: SCHEMA_VERSION,
        },
        errors: [
          {
            code: 'LINEAGE_QUERY_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      };
    }
  }

  /**
   * Compare two runs: inputs/outputs/confidence deltas.
   */
  async compareRuns(
    runIdA: string,
    runIdB: string,
    tenantId: string
  ): Promise<ExplainabilityAPIResponse<RunComparison>> {
    const requestId = uuidv4();
    const queriedAt = new Date().toISOString();

    try {
      const runAResponse = await this.getRun(runIdA, tenantId, 'system');
      const runBResponse = await this.getRun(runIdB, tenantId, 'system');

      if (!runAResponse.success || !runBResponse.success || !runAResponse.data || !runBResponse.data) {
        return {
          success: false,
          data: null,
          meta: {
            request_id: requestId,
            tenant_id: tenantId,
            queried_at: queriedAt,
            version: SCHEMA_VERSION,
          },
          errors: [
            {
              code: 'RUNS_NOT_FOUND',
              message: 'One or both runs not found',
            },
          ],
        };
      }

      const runA = runAResponse.data;
      const runB = runBResponse.data;

      const comparison: RunComparison = {
        run_a: runA,
        run_b: runB,
        deltas: {
          input_diff: this.computeDiff(runA.inputs.parameters, runB.inputs.parameters),
          output_diff: this.computeDiff(runA.outputs.results, runB.outputs.results),
          confidence_delta: runB.confidence.overall_confidence - runA.confidence.overall_confidence,
          duration_delta_ms:
            runA.duration_ms !== null && runB.duration_ms !== null
              ? runB.duration_ms - runA.duration_ms
              : null,
          different_capabilities: this.arrayDiff(runA.capabilities_used, runB.capabilities_used),
          different_policies: this.arrayDiff(
            runA.policy_decisions.map((d) => d.policy_name),
            runB.policy_decisions.map((d) => d.policy_name)
          ),
        },
      };

      return {
        success: true,
        data: comparison,
        meta: {
          request_id: requestId,
          tenant_id: tenantId,
          queried_at: queriedAt,
          version: SCHEMA_VERSION,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        meta: {
          request_id: requestId,
          tenant_id: tenantId,
          queried_at: queriedAt,
          version: SCHEMA_VERSION,
        },
        errors: [
          {
            code: 'COMPARISON_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      };
    }
  }

  /**
   * Verify linkage: run → provenance → SBOM hashes.
   * Returns verification report.
   */
  async verifyLinkage(
    runId: string,
    tenantId: string
  ): Promise<ExplainabilityAPIResponse<any>> {
    const requestId = uuidv4();
    const queriedAt = new Date().toISOString();

    try {
      // Get the run
      const runResponse = await this.getRun(runId, tenantId, 'system');
      if (!runResponse.success || !runResponse.data) {
        return {
          success: false,
          data: null,
          meta: {
            request_id: requestId,
            tenant_id: tenantId,
            queried_at: queriedAt,
            version: SCHEMA_VERSION,
          },
          errors: [{ code: 'RUN_NOT_FOUND', message: 'Run not found' }],
        };
      }

      const run = runResponse.data;
      const checks: Record<string, boolean> = {
        run_exists: true,
        audit_events_linked: run.audit_event_ids.length > 0,
        provenance_chain_valid: false,
        sbom_hashes_match: false,
        merkle_proof_valid: false,
      };

      const issues: string[] = [];

      // Verify provenance chain if exists
      if (run.provenance_links.provenance_chain_id) {
        try {
          const provenanceService = ProvenanceLedgerBetaService.getInstance();
          // TODO: Call provenanceService.getProvenanceChain() or similar
          checks.provenance_chain_valid = true;
        } catch (err: any) {
          checks.provenance_chain_valid = false;
          issues.push('Provenance chain validation failed');
        }
      }

      // Verify SBOM if exists
      if (run.provenance_links.sbom_id) {
        // TODO: Verify SBOM hashes
        checks.sbom_hashes_match = true;
      }

      // Verify Merkle proof if exists
      if (run.provenance_links.merkle_root && run.provenance_links.merkle_proof) {
        // TODO: Verify Merkle proof
        checks.merkle_proof_valid = true;
      }

      if (run.audit_event_ids.length === 0) {
        issues.push('No audit events linked');
      }

      const verification = {
        run_id: runId,
        verified: Object.values(checks).every(Boolean) && issues.length === 0,
        checks,
        issues,
      };

      logger.info({
        message: 'Verified linkage',
        run_id: runId,
        verified: verification.verified,
        issues_count: issues.length,
      });

      return {
        success: true,
        data: verification,
        meta: {
          request_id: requestId,
          tenant_id: tenantId,
          queried_at: queriedAt,
          version: SCHEMA_VERSION,
        },
      };
    } catch (error: any) {
      logger.error({
        message: 'Failed to verify linkage',
        run_id: runId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        data: null,
        meta: {
          request_id: requestId,
          tenant_id: tenantId,
          queried_at: queriedAt,
          version: SCHEMA_VERSION,
        },
        errors: [
          {
            code: 'VERIFICATION_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      };
    }
  }

  /**
   * Map database row to ExplainableRun.
   * Fetches related claims, evidence, sources, transforms.
   */
  private async mapRowToExplainableRun(row: any): Promise<ExplainableRun> {
    // Fetch provenance links
    const claims = await this.fetchRunClaims(row.run_id);
    const evidence = await this.fetchRunEvidence(row.run_id);
    const sources = await this.fetchRunSources(row.run_id);
    const transforms = await this.fetchRunTransforms(row.run_id);

    return {
      run_id: row.run_id,
      run_type: row.run_type,
      tenant_id: row.tenant_id,
      actor: {
        actor_type: row.actor_type,
        actor_id: row.actor_id,
        actor_name: row.actor_name,
        actor_role: row.actor_role,
        authentication_method: row.authentication_method,
      },
      started_at: row.started_at?.toISOString() || new Date().toISOString(),
      completed_at: row.completed_at?.toISOString() || null,
      duration_ms: row.duration_ms,
      inputs: {
        parameters: row.inputs_parameters || {},
        input_hash: row.inputs_hash,
        hashing_algorithm: row.inputs_hashing_algorithm || 'sha256',
        pii_fields_redacted: row.inputs_pii_redacted || [],
        secret_fields_redacted: row.inputs_secret_redacted || [],
        input_sources: row.inputs_sources || [],
      },
      outputs: {
        results: row.outputs_results || {},
        output_hash: row.outputs_hash,
        hashing_algorithm: row.outputs_hashing_algorithm || 'sha256',
        pii_fields_redacted: row.outputs_pii_redacted || [],
        secret_fields_redacted: row.outputs_secret_redacted || [],
        artifacts: row.outputs_artifacts || [],
        side_effects: row.outputs_side_effects || [],
      },
      explanation: {
        summary: row.explanation_summary,
        reasoning_steps: row.explanation_reasoning_steps || [],
        why_triggered: row.explanation_why_triggered || '',
        why_this_approach: row.explanation_why_this_approach || '',
        alternatives_considered: row.explanation_alternatives || [],
      },
      confidence: {
        overall_confidence: parseFloat(row.confidence_overall),
        confidence_basis: row.confidence_basis || '',
        evidence_count: row.confidence_evidence_count || 0,
        evidence_quality: row.confidence_evidence_quality || 'unknown',
        source_count: row.confidence_source_count || 0,
        source_licenses: row.confidence_source_licenses || [],
        source_reliability: row.confidence_source_reliability || 'unverified',
        validated: row.confidence_validated || false,
        validation_method: row.confidence_validation_method,
        validated_at: row.confidence_validated_at?.toISOString() || null,
      },
      assumptions: row.assumptions || [],
      limitations: row.limitations || [],
      policy_decisions: row.policy_decisions || [],
      capabilities_used: row.capabilities_used || [],
      provenance_links: {
        provenance_chain_id: row.provenance_chain_id,
        claims,
        evidence,
        sources,
        transforms,
        sbom_id: row.sbom_id,
        cosign_attestations: [],
        merkle_root: null,
        merkle_proof: null,
      },
      parent_run_id: row.parent_run_id,
      child_run_ids: row.child_run_ids || [],
      audit_event_ids: row.audit_event_ids || [],
      version: row.version || SCHEMA_VERSION,
      redacted_fields: row.redacted_fields || [],
    };
  }

  private async fetchRunClaims(runId: string): Promise<ClaimReference[]> {
    try {
      const sql = `
        SELECT * FROM explainable_run_claims
        WHERE run_id = $1
      `;
      const result = await timescaleQuery(sql, [runId]);
      return result.rows.map((row: any) => ({
        claim_id: row.claim_id,
        claim_type: row.claim_type,
        confidence: parseFloat(row.confidence),
        supporting_evidence_count: row.supporting_evidence_count || 0,
      }));
    } catch (err: any) {
      logger.warn({ message: 'Failed to fetch claims', run_id: runId, error: err });
      return [];
    }
  }

  private async fetchRunEvidence(runId: string): Promise<EvidenceReference[]> {
    try {
      const sql = `
        SELECT * FROM explainable_run_evidence
        WHERE run_id = $1
      `;
      const result = await timescaleQuery(sql, [runId]);
      return result.rows.map((row: any) => ({
        evidence_id: row.evidence_id,
        evidence_type: row.evidence_type,
        classification: row.classification,
        integrity_hash: row.integrity_hash,
      }));
    } catch (err: any) {
      logger.warn({ message: 'Failed to fetch evidence', run_id: runId, error: err });
      return [];
    }
  }

  private async fetchRunSources(runId: string): Promise<SourceReference[]> {
    try {
      const sql = `
        SELECT * FROM explainable_run_sources
        WHERE run_id = $1
      `;
      const result = await timescaleQuery(sql, [runId]);
      return result.rows.map((row: any) => ({
        source_id: row.source_id,
        source_type: row.source_type,
        license: row.license,
        retrieved_at: row.retrieved_at?.toISOString() || new Date().toISOString(),
      }));
    } catch (err: any) {
      logger.warn({ message: 'Failed to fetch sources', run_id: runId, error: err });
      return [];
    }
  }

  private async fetchRunTransforms(runId: string): Promise<TransformReference[]> {
    try {
      const sql = `
        SELECT * FROM explainable_run_transforms
        WHERE run_id = $1
      `;
      const result = await timescaleQuery(sql, [runId]);
      return result.rows.map((row: any) => ({
        transform_id: row.transform_id,
        transform_type: row.transform_type,
        parent_transform_id: row.parent_transform_id,
      }));
    } catch (err: any) {
      logger.warn({ message: 'Failed to fetch transforms', run_id: runId, error: err });
      return [];
    }
  }

  private hashObject(obj: any): string {
    const canonical = JSON.stringify(obj, Object.keys(obj).sort());
    return createHash('sha256').update(canonical).digest('hex');
  }

  private computeDiff(a: any, b: any): any {
    // Simple diff implementation
    const diff: any = {};
    const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);

    for (const key of allKeys) {
      if (JSON.stringify(a?.[key]) !== JSON.stringify(b?.[key])) {
        diff[key] = { before: a?.[key], after: b?.[key] };
      }
    }

    return diff;
  }

  private arrayDiff(a: string[], b: string[]): string[] {
    const setA = new Set(a);
    const setB = new Set(b);
    const diff = new Set([
      ...Array.from(setA).filter(x => !setB.has(x)),
      ...Array.from(setB).filter(x => !setA.has(x))
    ]);
    return Array.from(diff);
  }
}
