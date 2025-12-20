import crypto from 'node:crypto';

import {
  DecisionRecord,
  DecisionRecorder,
  PolicyConstraints,
} from './decision-recorder.js';
import {
  LearningToRankRouter,
  ModelCandidate,
  QueryFeatures,
  RouteDecision,
  learningToRankRouter,
} from './learning-to-rank.js';

export interface LLMRouteRequest {
  prompt: string;
  context?: Record<string, any>;
  tenantId: string;
  userId?: string;
  features: QueryFeatures;
  policies?: string[];
  constraints?: PolicyConstraints;
  redactions?: string[];
  startedAt?: string;
}

export interface LLMRouteResult {
  decision: RouteDecision;
  record: DecisionRecord;
}

export class LLMDecisionRouter {
  constructor(
    private router: LearningToRankRouter = learningToRankRouter,
    private recorder: DecisionRecorder = new DecisionRecorder(),
  ) {}

  async route(
    request: LLMRouteRequest,
    options: { persist?: boolean; applySideEffects?: boolean } = {},
  ): Promise<LLMRouteResult> {
    const policies = request.policies || [];
    const constraints = request.constraints || {};
    const { candidates, fairnessMetrics } = await this.router.rankCandidates(
      request.features,
      request.tenantId,
    );

    const fallbacks: Array<{ provider: string; model: string; reason: string }> = [];

    const orderedCandidates = this.reorderByPreferredProviders(
      candidates,
      constraints.preferredProviders,
    );

    const selectedCandidate = this.selectCandidate(
      orderedCandidates,
      constraints,
      request.features,
      fallbacks,
    );

    if (!selectedCandidate) {
      throw new Error('No model satisfies provided policy constraints');
    }

    if (options.applySideEffects !== false) {
      await this.router.finalizeSelection(
        selectedCandidate.model.id,
        request.features,
        request.tenantId,
      );
    }

    const estimatedCost = this.estimateCost(selectedCandidate.model, request.features);
    const guardrailActions = { piiRedactions: request.redactions || [] };

    const decisionRecord: DecisionRecord = {
      decisionId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      request: {
        prompt: request.prompt,
        context: request.context || {},
        tenantId: request.tenantId,
        userId: request.userId,
        policies,
        constraints,
        features: request.features,
      },
      outcome: {
        provider: selectedCandidate.model.provider,
        model: selectedCandidate.model.id,
        score: selectedCandidate.score,
        estimatedCost,
        estimatedLatency: selectedCandidate.model.avgLatencyMs,
        fairness: fairnessMetrics,
        guardrailActions,
        fallbacks,
      },
      meta: {
        decisionStartedAt: request.startedAt || new Date().toISOString(),
        decidedAt: new Date().toISOString(),
      },
    };

    if (options.persist !== false) {
      await this.recorder.record(decisionRecord);
    }

    const decision: RouteDecision = {
      selectedModel: selectedCandidate.model,
      score: selectedCandidate.score,
      reasoning: selectedCandidate.reasoning,
      fairnessMetrics,
      explanation: {
        decisionTree: [
          {
            condition: `Preferred providers applied in order: ${
              constraints.preferredProviders?.join(', ') || 'none'
            }`,
            impact: 1,
            explanation: 'Policy ordering is honored before constraint evaluation.',
          },
        ],
        featureImportance: [
          {
            feature: 'Estimated cost',
            weight: 1,
            value: estimatedCost,
          },
          {
            feature: 'Latency budget',
            weight: 1,
            value: selectedCandidate.model.avgLatencyMs,
          },
        ],
        alternatives: fallbacks.map((fallback) => ({
          model: fallback.model,
          score: selectedCandidate.score,
          tradeoffs: fallback.reason,
        })),
        policyInfluence: policies,
      },
    };

    return { decision, record: decisionRecord };
  }

  private selectCandidate(
    candidates: Array<{ model: ModelCandidate; score: number; reasoning: string }>,
    constraints: PolicyConstraints,
    features: QueryFeatures,
    fallbacks: Array<{ provider: string; model: string; reason: string }>,
  ): { model: ModelCandidate; score: number; reasoning: string } | undefined {
    for (const candidate of candidates) {
      const violation = this.findConstraintViolation(
        candidate.model,
        constraints,
        features,
      );

      if (violation) {
        fallbacks.push({
          provider: candidate.model.provider,
          model: candidate.model.id,
          reason: violation,
        });
        continue;
      }

      return candidate;
    }

    return undefined;
  }

  private reorderByPreferredProviders(
    candidates: Array<{ model: ModelCandidate; score: number; reasoning: string }>,
    preferredProviders?: string[],
  ): Array<{ model: ModelCandidate; score: number; reasoning: string }> {
    if (!preferredProviders?.length) {
      return candidates;
    }

    const prioritized = new Map<string, Array<{ model: ModelCandidate; score: number; reasoning: string }>>();
    const remainder: Array<{ model: ModelCandidate; score: number; reasoning: string }> = [];

    for (const candidate of candidates) {
      if (preferredProviders.includes(candidate.model.provider)) {
        const bucket = prioritized.get(candidate.model.provider) || [];
        bucket.push(candidate);
        prioritized.set(candidate.model.provider, bucket);
      } else {
        remainder.push(candidate);
      }
    }

    const orderedPriorities: Array<{
      model: ModelCandidate;
      score: number;
      reasoning: string;
    }> = [];

    for (const provider of preferredProviders) {
      const bucket = prioritized.get(provider);
      if (bucket?.length) {
        orderedPriorities.push(...bucket);
      }
    }

    return [...orderedPriorities, ...remainder];
  }

  private findConstraintViolation(
    candidate: ModelCandidate,
    constraints: PolicyConstraints,
    features: QueryFeatures,
  ): string | null {
    if (
      constraints.allowedProviders?.length &&
      !constraints.allowedProviders.includes(candidate.provider)
    ) {
      return 'provider_blocked_by_policy';
    }

    if (constraints.blockedModels?.includes(candidate.id)) {
      return 'model_blocked_by_policy';
    }

    if (constraints.maxLatencyMs && candidate.avgLatencyMs > constraints.maxLatencyMs) {
      return 'latency_budget_exceeded';
    }

    const estimatedCost = this.estimateCost(candidate, features);
    if (constraints.maxCost && estimatedCost > constraints.maxCost) {
      return 'cost_budget_exceeded';
    }

    return null;
  }

  private estimateCost(model: ModelCandidate, features: QueryFeatures): number {
    return Number((model.costPerToken * features.estimatedTokens).toFixed(6));
  }
}
