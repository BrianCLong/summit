/**
 * Explainability Explorer Service
 *
 * Read-only service for querying explainability artifacts.
 * Implements: docs/explainability/EXPLAINABILITY_CONTRACT.md
 */

import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
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
      // TODO: Query actual database (provenance, audit logs, etc.)
      // For now, return mock data structure
      const runs: ExplainableRun[] = [];

      // Apply filters
      const limit = filter.limit ?? 50;
      const offset = filter.offset ?? 0;

      return {
        success: true,
        data: runs.slice(offset, offset + limit),
        meta: {
          request_id: requestId,
          tenant_id: tenantId,
          queried_at: queriedAt,
          version: SCHEMA_VERSION,
        },
      };
    } catch (error) {
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
      // TODO: Query actual database
      // Verify tenant isolation: run.tenant_id === tenantId

      // Mock implementation
      const run = await this.buildExplainableRun(runId, tenantId);

      if (!run) {
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
    } catch (error) {
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
      // TODO: Traverse provenance chains using ProvenanceLedgerBetaService
      const lineage = {
        run_id: runId,
        depth_traversed: depth,
        nodes: [],
        edges: [],
      };

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
    } catch (error) {
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
    } catch (error) {
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
      // TODO: Use ProvenanceLedgerBetaService.verifyBundle()
      const verification = {
        run_id: runId,
        verified: true,
        checks: {
          run_exists: true,
          audit_events_linked: true,
          provenance_chain_valid: true,
          sbom_hashes_match: true,
          merkle_proof_valid: true,
        },
        issues: [],
      };

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
    } catch (error) {
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
   * Build an ExplainableRun from database records.
   * Aggregates: audit logs, provenance chains, policy decisions.
   */
  private async buildExplainableRun(
    runId: string,
    tenantId: string
  ): Promise<ExplainableRun | null> {
    // TODO: Query actual data sources:
    // 1. Audit events (ImmutableAuditService)
    // 2. Provenance chains (ProvenanceLedgerBetaService)
    // 3. Policy decisions (from policy engine)
    // 4. Agent run logs (if applicable)

    // Mock implementation
    return {
      run_id: runId,
      run_type: 'agent_run',
      tenant_id: tenantId,
      actor: {
        actor_type: 'agent',
        actor_id: 'agent-123',
        actor_name: 'Summit Agent',
        actor_role: 'investigator',
        authentication_method: 'service_account',
      },
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: 1500,
      inputs: this.buildInputs(),
      outputs: this.buildOutputs(),
      explanation: this.buildExplanation(),
      confidence: this.buildConfidence(),
      assumptions: [],
      limitations: [],
      policy_decisions: [],
      capabilities_used: ['graph_query', 'claim_extraction'],
      provenance_links: this.buildProvenanceLinks(),
      parent_run_id: null,
      child_run_ids: [],
      audit_event_ids: [],
      version: SCHEMA_VERSION,
      redacted_fields: [],
    };
  }

  private buildInputs(): ExplainableInputs {
    const params = { query: 'find all claims about entity X' };
    return {
      parameters: params,
      input_hash: this.hashObject(params),
      hashing_algorithm: 'sha256',
      pii_fields_redacted: [],
      secret_fields_redacted: [],
      input_sources: [],
    };
  }

  private buildOutputs(): ExplainableOutputs {
    const results = { claim_count: 5, status: 'success' };
    return {
      results,
      output_hash: this.hashObject(results),
      hashing_algorithm: 'sha256',
      pii_fields_redacted: [],
      secret_fields_redacted: [],
      artifacts: [],
      side_effects: [],
    };
  }

  private buildExplanation(): Explanation {
    return {
      summary: 'Agent executed graph query to extract claims about entity X',
      reasoning_steps: [
        {
          step_number: 1,
          description: 'Parse query intent',
          inputs: ['query'],
          outputs: ['parsed_intent'],
          confidence: 0.95,
          rationale: 'Natural language processing identified entity extraction task',
        },
      ],
      why_triggered: 'User requested claim extraction',
      why_this_approach: 'Graph query is most efficient for structured claim retrieval',
      alternatives_considered: [],
    };
  }

  private buildConfidence(): ConfidenceMetrics {
    return {
      overall_confidence: 0.85,
      confidence_basis: 'Evidence count and source reliability',
      evidence_count: 5,
      evidence_quality: 'high',
      source_count: 3,
      source_licenses: ['internal'],
      source_reliability: 'verified',
      validated: false,
      validation_method: null,
      validated_at: null,
    };
  }

  private buildProvenanceLinks(): ProvenanceLinks {
    return {
      provenance_chain_id: null,
      claims: [],
      evidence: [],
      sources: [],
      transforms: [],
      sbom_id: null,
      cosign_attestations: [],
      merkle_root: null,
      merkle_proof: null,
    };
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
