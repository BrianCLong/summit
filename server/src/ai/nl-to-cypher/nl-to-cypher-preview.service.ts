import crypto from 'crypto';
import { randomUUID } from 'node:crypto';
import { NlToCypherService } from './nl-to-cypher.service.js';
import type { ModelAdapter } from './model-adapter.js';
import { provenanceLedger } from '../../provenance/ledger.js';
import { logger } from '../../utils/logger.js';
import {
  previewGuardrailBlocksTotal,
  previewLatencyMs,
  previewAccuracyRatio,
} from '../../monitoring/metrics.js';

export interface PreviewContext {
  timeframe?: string;
  focusNodes?: string[];
  bundleId?: string;
}

export interface PreviewRequest {
  queryText: string;
  actorId: string;
  tenantId: string;
  context?: PreviewContext;
  traceId?: string;
}

export interface PreviewCandidate {
  cypher: string;
  confidence: number;
  policiesApplied: string[];
  explain: string;
  kpis: { latencyMs: number; policyHits: number };
  verification: { hash: string; bundleId: string };
}

export interface PreviewResponse {
  candidates: PreviewCandidate[];
  telemetry: { traceId: string; cache: 'HIT' | 'MISS' };
}

const unsafeVerbs = ['delete', 'drop', 'truncate', 'detach delete'];

class GuardrailViolation extends Error {
  status = 429;
  reason: string;

  constructor(message: string, reason: string) {
    super(message);
    this.reason = reason;
  }
}

class PolicyViolation extends Error {
  status = 403;
  policy: string;

  constructor(message: string, policy: string) {
    super(message);
    this.policy = policy;
  }
}

export class NlToCypherPreviewService {
  private readonly cache = new Map<
    string,
    { response: PreviewResponse; expiresAt: number }
  >();
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private readonly nlToCypherService: NlToCypherService;

  constructor(adapter?: ModelAdapter) {
    this.nlToCypherService = new NlToCypherService(
      adapter ?? {
        async generate(prompt: string): Promise<string> {
          if (/community growth/i.test(prompt)) {
            return 'MATCH (c:Community)-[r:MEMBER_OF]->(m:Member) RETURN c, count(r) AS memberships';
          }
          return `MATCH (n) WHERE n.description CONTAINS $prompt RETURN n LIMIT 50`;
        },
      },
    );
  }

  async preview(request: PreviewRequest): Promise<PreviewResponse> {
    const traceId = request.traceId ?? randomUUID();
    const startedAt = Date.now();

    this.assertValidRequest(request);
    this.guardrails(request);

    const cacheKey = this.buildCacheKey(request);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      const latency = Date.now() - startedAt;
      previewLatencyMs.observe({ cache: 'HIT', tenant: request.tenantId }, latency);
      return {
        ...cached.response,
        telemetry: { ...cached.response.telemetry, cache: 'HIT', traceId },
      };
    }

    const candidates = await this.generateCandidates(request, startedAt);
    const response: PreviewResponse = {
      candidates,
      telemetry: { traceId, cache: 'MISS' },
    };

    this.cache.set(cacheKey, {
      response,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    previewLatencyMs.observe({ cache: 'MISS', tenant: request.tenantId }, Date.now() - startedAt);

    await this.appendProvenanceEvent(request, response);

    return response;
  }

  private assertValidRequest(request: PreviewRequest): void {
    if (!request.queryText?.trim()) {
      throw new GuardrailViolation('queryText is required', 'invalid-request');
    }
    if (!request.actorId?.trim() || !request.tenantId?.trim()) {
      throw new GuardrailViolation('actorId and tenantId are required', 'invalid-request');
    }
  }

  private guardrails(request: PreviewRequest): void {
    const normalized = request.queryText.toLowerCase();
    for (const verb of unsafeVerbs) {
      if (normalized.includes(verb)) {
        previewGuardrailBlocksTotal.inc({ tenant: request.tenantId, reason: verb });
        throw new GuardrailViolation('Unsafe verb blocked by guardrail', verb);
      }
    }

    if ((request.context?.focusNodes?.length ?? 0) > 50) {
      previewGuardrailBlocksTotal.inc({ tenant: request.tenantId, reason: 'focus-nodes-depth' });
      throw new GuardrailViolation('Focus node set exceeds policy depth', 'focus-nodes-depth');
    }
  }

  private async generateCandidates(
    request: PreviewRequest,
    startedAt: number,
  ): Promise<PreviewCandidate[]> {
    const base = await this.nlToCypherService.translateWithPreview(
      request.queryText,
      request.actorId,
      request.tenantId,
    );

    const cypherBaseline = this.enforceContext(base.generatedCypher, request.context);
    const cypherConstrained = this.applySafetyControls(cypherBaseline, request.context);
    const cypherExplainer = this.appendExplainability(cypherConstrained);

    const variants = [cypherBaseline, cypherConstrained, cypherExplainer];
    const now = Date.now();
    const latency = now - startedAt;

    return variants.map((cypher, index) => {
      const policies = this.derivePolicies(cypher, request.context);
      if (policies.blockedBy) {
        throw new PolicyViolation('Policy violation detected', policies.blockedBy);
      }

      const verificationHash = crypto
        .createHash('sha256')
        .update(`${cypher}:${request.tenantId}:${request.actorId}`)
        .digest('hex');

      const confidence = this.calculateConfidence(index, base.validation.isValid, policies.policyHits);

      return {
        cypher,
        confidence,
        policiesApplied: policies.applied,
        explain: policies.explanation,
        kpis: {
          latencyMs: latency,
          policyHits: policies.policyHits,
        },
        verification: {
          hash: verificationHash,
          bundleId: request.context?.bundleId ?? 'r2-demo-default',
        },
      } satisfies PreviewCandidate;
    });
  }

  private enforceContext(cypher: string, context?: PreviewContext): string {
    if (!context?.timeframe) return cypher;
    if (/WHERE/i.test(cypher)) {
      return cypher.replace(/WHERE/i, `WHERE timestamp >= datetime() - duration('${context.timeframe}') AND `);
    }
    return `${cypher} WHERE timestamp >= datetime() - duration('${context.timeframe}')`;
  }

  private applySafetyControls(cypher: string, context?: PreviewContext): string {
    let safeCypher = cypher;
    if (!/LIMIT\s+\d+/i.test(safeCypher)) {
      safeCypher = `${safeCypher} LIMIT 100`;
    }
    if (context?.focusNodes?.length) {
      const ids = context.focusNodes.map((id) => `'${id}'`).join(', ');
      if (/WHERE/i.test(safeCypher)) {
        safeCypher = safeCypher.replace(/WHERE/i, `WHERE id(n) IN [${ids}] AND `);
      } else {
        safeCypher = `${safeCypher} WHERE id(n) IN [${ids}]`;
      }
    }
    return safeCypher;
  }

  private appendExplainability(cypher: string): string {
    if (/RETURN/i.test(cypher)) {
      return cypher.replace(/RETURN/i, 'WITH *, 1 AS explainAnchor RETURN');
    }
    return `${cypher} WITH 1 AS explainAnchor RETURN *`;
  }

  private derivePolicies(cypher: string, context?: PreviewContext): {
    applied: string[];
    explanation: string;
    blockedBy?: string;
    policyHits: number;
  } {
    const applied = new Set<string>();
    const explanations: string[] = [];
    const upper = cypher.toUpperCase();

    if (!upper.includes('LIMIT')) {
      applied.add('POL-44');
      explanations.push('POL-44 enforces bounded result sets');
    }

    if (upper.includes('MATCH (') && !upper.includes('WHERE')) {
      applied.add('POL-12');
      explanations.push('POL-12 requires scoped graph access');
    }

    if (/\bCREATE\b|\bDELETE\b|\bMERGE\b/.test(upper)) {
      applied.add('POL-99-BLOCK');
      explanations.push('POL-99 prevents mutations in preview mode');
    }

    if (context?.timeframe) {
      applied.add('POL-21');
      explanations.push('POL-21 mandates temporal scoping');
    }

    if (context?.focusNodes?.length) {
      applied.add('POL-33');
      explanations.push('POL-33 restricts previews to focus nodes');
    }

    const blockedBy = applied.has('POL-99-BLOCK') ? 'POL-99-BLOCK' : undefined;

    return {
      applied: Array.from(applied),
      explanation: explanations.join('; '),
      blockedBy,
      policyHits: applied.size,
    };
  }

  private calculateConfidence(
    index: number,
    isValid: boolean,
    policyHits: number,
  ): number {
    const base = isValid ? 0.92 : 0.75;
    const policyPenalty = policyHits * 0.01;
    const variantPenalty = index * 0.03;
    return Math.max(0.5, base - policyPenalty - variantPenalty);
  }

  private buildCacheKey(request: PreviewRequest): string {
    const focus = request.context?.focusNodes?.join(',') ?? 'none';
    const timeframe = request.context?.timeframe ?? 'none';
    return `${request.tenantId}:${request.queryText.trim().toLowerCase()}:${focus}:${timeframe}`;
  }

  private async appendProvenanceEvent(
    request: PreviewRequest,
    response: PreviewResponse,
  ): Promise<void> {
    try {
      await provenanceLedger.appendEntry({
        tenantId: request.tenantId,
        actorId: request.actorId,
        actorType: 'user',
        actionType: 'preview.generated',
        resourceType: 'nl-to-cypher-preview',
        resourceId: response.telemetry.traceId,
        payload: {
          queryText: request.queryText,
          candidateCount: response.candidates.length,
          cache: response.telemetry.cache,
          bundleId: request.context?.bundleId ?? 'r2-demo-default',
        },
        metadata: {
          correlationId: response.telemetry.traceId,
          purpose: 'nl-to-cypher-preview',
        },
      });
      previewAccuracyRatio.set({ bundle: request.context?.bundleId ?? 'r2-demo-default' }, 0.95);
    } catch (error) {
      logger.warn({ error }, 'Failed to append preview provenance entry');
    }
  }
}
