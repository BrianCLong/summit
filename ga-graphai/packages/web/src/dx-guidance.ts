import {
  OrchestrationKnowledgeGraph,
  type ServiceRiskProfile,
} from '@ga-graphai/knowledge-graph';
import {
  GuardedPolicyGateway,
  type GuardedDecision,
} from '@ga-graphai/policy';
import type { PolicyEvaluationRequest } from 'common-types';

export type Persona = 'feature-dev' | 'platform-engineer' | 'sre';

export interface DxEvent {
  id: string;
  persona: Persona;
  channel: 'cli' | 'ui' | 'chatops';
  command: string;
  durationMs: number;
  success: boolean;
  satisfactionScore?: number;
  frictionTags?: string[];
  timestamp: string;
}

export interface DxGuidanceOptions {
  knowledgeGraph: OrchestrationKnowledgeGraph;
  policyGateway: GuardedPolicyGateway;
}

export interface GoldenPathRecommendation {
  serviceId: string;
  environmentId: string;
  steps: string[];
  guardrails: GuardedDecision;
  risk: ServiceRiskProfile | undefined;
  suggestedSurvey: boolean;
}

export interface DxTelemetrySummary {
  totalEvents: number;
  successRate: number;
  averageSatisfaction?: number;
  frictionHotspots: Record<string, number>;
}

export class DeveloperExperienceGuide {
  private readonly knowledgeGraph: OrchestrationKnowledgeGraph;
  private readonly policyGateway: GuardedPolicyGateway;
  private readonly events: DxEvent[] = [];

  constructor(options: DxGuidanceOptions) {
    this.knowledgeGraph = options.knowledgeGraph;
    this.policyGateway = options.policyGateway;
  }

  recommendGoldenPath(
    serviceId: string,
    persona: Persona,
    context: {
      environmentId?: string;
      actor: PolicyEvaluationRequest['context'];
      guardContext?: Parameters<GuardedPolicyGateway['evaluate']>[1];
    },
  ): GoldenPathRecommendation | undefined {
    const serviceContext = this.knowledgeGraph.queryService(serviceId);
    if (!serviceContext) {
      return undefined;
    }
    const environmentId = context.environmentId ?? serviceContext.environments?.[0]?.id ?? 'unknown';
    const guardrails = this.policyGateway.evaluate(
      {
        action: persona === 'sre' ? 'orchestration.rollback' : 'orchestration.deploy',
        resource: `service:${serviceId}`,
        context: context.actor,
      },
      context.guardContext,
    );

    const steps = this.buildSteps(persona, environmentId, guardrails.requiresApproval);
    const risk = serviceContext.risk;
    const suggestedSurvey = persona === 'feature-dev' && (!risk || risk.score < 0.4);

    return {
      serviceId,
      environmentId,
      steps,
      guardrails,
      risk,
      suggestedSurvey,
    };
  }

  recordEvent(event: DxEvent): void {
    this.events.push(event);
  }

  telemetrySummary(): DxTelemetrySummary {
    if (this.events.length === 0) {
      return { totalEvents: 0, successRate: 0, frictionHotspots: {} };
    }
    const total = this.events.length;
    const successes = this.events.filter((event) => event.success).length;
    const satisfactionScores = this.events
      .map((event) => event.satisfactionScore)
      .filter((score): score is number => typeof score === 'number');
    const frictionHotspots: Record<string, number> = {};
    for (const event of this.events) {
      for (const tag of event.frictionTags ?? []) {
        frictionHotspots[tag] = (frictionHotspots[tag] ?? 0) + 1;
      }
    }
    const averageSatisfaction =
      satisfactionScores.length > 0
        ? Number(
            (
              satisfactionScores.reduce((acc, score) => acc + score, 0) /
              satisfactionScores.length
            ).toFixed(2),
          )
        : undefined;
    return {
      totalEvents: total,
      successRate: Number((successes / total).toFixed(2)),
      averageSatisfaction,
      frictionHotspots,
    };
  }

  private buildSteps(persona: Persona, environmentId: string, requiresApproval: boolean): string[] {
    const base = [`Open portal golden path for ${environmentId}`, 'Run pipeline dry-run'];
    if (persona === 'platform-engineer') {
      base.unshift('Review knowledge graph diff for service');
    }
    if (persona === 'sre') {
      base.push('Trigger rehearsal mode for self-healing runbook');
    }
    if (requiresApproval) {
      base.push('Request approval via guardrail gateway before execution');
    }
    base.push('Capture DX survey response');
    return base;
  }
}

export type { DxGuidanceOptions };
