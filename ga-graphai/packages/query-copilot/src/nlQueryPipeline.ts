import { performance } from 'node:perf_hooks';
import { CostGuard } from '@ga-graphai/cost-guard';
import { SimpleProvenanceLedger, createExportManifest } from '@ga-graphai/prov-ledger';
import type { LedgerEntry } from 'common-types';
import { nlToCypher } from './nlToCypher.js';
import type { NLToCypherOptions } from './types.js';

export interface NlQueryRequest {
  prompt: string;
  schema: NLToCypherOptions['schema'];
  datasetScope: string;
  hypothesis?: string;
  justification?: string;
  tenantId: string;
  authorityRoles: string[];
  license?: string;
}

export interface NlQueryPreviewResult {
  cypher: string;
  valid: boolean;
  decision: 'allow' | 'deny';
  reason: string;
  costBudget: number;
  guardrail: ReturnType<CostGuard['planBudget']>;
  latencyMs: number;
  manifest?: ReturnType<typeof createExportManifest>;
  warnings: string[];
}

interface ValidationResult {
  valid: boolean;
  warnings: string[];
  reason?: string;
}

function validateCypher(query: string): ValidationResult {
  const warnings: string[] = [];
  const lowered = query.toLowerCase();
  if (!lowered.includes('match') || !lowered.includes('return')) {
    return { valid: false, warnings, reason: 'Cypher must include MATCH and RETURN.' };
  }
  if (/\b(delete|drop|detach)\b/.test(lowered)) {
    warnings.push('Destructive keyword detected; sandbox only.');
  }
  return { valid: true, warnings };
}

export class NlQueryPipeline {
  private readonly costGuard: CostGuard;
  private readonly ledger: SimpleProvenanceLedger;

  constructor(costGuard?: CostGuard, ledger?: SimpleProvenanceLedger) {
    this.costGuard = costGuard ?? new CostGuard();
    this.ledger = ledger ?? new SimpleProvenanceLedger();
  }

  preview(request: NlQueryRequest): NlQueryPreviewResult {
    const start = performance.now();
    const generation = nlToCypher(request.prompt, { schema: request.schema });
    const validation = validateCypher(generation.cypher);

    const guardrail = this.costGuard.planBudget({
      tenantId: request.tenantId,
      plan: {
        estimatedRru: generation.costEstimate.estimatedRru,
        estimatedLatencyMs: generation.costEstimate.estimatedLatencyMs,
        depth: 2,
        operations: 2,
        containsCartesianProduct: generation.costEstimate.anticipatedRows > 500,
      },
      activeQueries: request.authorityRoles.length,
      recentLatencyP95: generation.costEstimate.estimatedLatencyMs,
    });

    const allowed = validation.valid && guardrail.action !== 'kill';
    const reason = validation.reason ?? guardrail.reason;
    const warnings = [...generation.warnings, ...validation.warnings];

    let manifest: ReturnType<typeof createExportManifest> | undefined;
    const auditEntries: LedgerEntry[] = [];

    if (allowed) {
      auditEntries.push(
        this.ledger.append({
          id: `nl-${Date.now()}`,
          category: 'nl-to-cypher',
          actor: request.tenantId,
          action: 'translate',
          resource: request.datasetScope,
          payload: {
            prompt: request.prompt,
            cypher: generation.cypher,
            justification: request.justification ?? 'none',
            license: request.license ?? 'unspecified',
          },
        }),
      );
      manifest = createExportManifest({
        caseId: request.datasetScope,
        ledger: auditEntries,
      });
    }

    const latencyMs = Number((performance.now() - start).toFixed(2));

    return {
      cypher: generation.cypher,
      valid: validation.valid,
      decision: allowed ? 'allow' : 'deny',
      reason: allowed ? guardrail.reason : reason,
      costBudget: generation.costEstimate.estimatedRru,
      guardrail,
      latencyMs,
      manifest,
      warnings,
    };
  }
}
