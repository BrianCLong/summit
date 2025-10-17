import { CostGuard } from '@ga-graphai/cost-guard';
import {
  OrchestrationKnowledgeGraph,
  type ServiceRiskProfile,
} from '@ga-graphai/knowledge-graph';
import type { HealthSignal } from './types.js';

type InsightLevel = 'low' | 'medium' | 'high';

export interface PredictiveInsight {
  serviceId: string;
  environmentId: string;
  riskScore: number;
  readinessScore: number;
  insightLevel: InsightLevel;
  recommendations: string[];
  lastUpdated: Date;
}

export interface PredictiveInsightEngineOptions {
  knowledgeGraph: OrchestrationKnowledgeGraph;
  costGuard?: CostGuard;
  riskThresholds?: {
    high: number;
    medium: number;
  };
}

interface ServiceHealthState {
  latencyMs?: number;
  errorRate?: number;
  saturation?: number;
  lastSignalAt: Date;
}

export class PredictiveInsightEngine {
  private readonly knowledgeGraph: OrchestrationKnowledgeGraph;
  private readonly costGuard?: CostGuard;
  private readonly riskThresholds: Required<PredictiveInsightEngineOptions['riskThresholds']>;
  private readonly health: Map<string, ServiceHealthState> = new Map();

  constructor(options: PredictiveInsightEngineOptions) {
    this.knowledgeGraph = options.knowledgeGraph;
    this.costGuard = options.costGuard;
    this.riskThresholds = {
      high: 0.7,
      medium: 0.4,
      ...options.riskThresholds,
    };
  }

  observeHealthSignal(signal: HealthSignal): void {
    const existing = this.health.get(signal.assetId) ?? {
      lastSignalAt: signal.timestamp,
    };
    const metric = signal.metric.toLowerCase();
    if (metric.includes('latency')) {
      existing.latencyMs = signal.value;
    }
    if (metric.includes('error')) {
      existing.errorRate = signal.value;
    }
    if (metric.includes('saturation') || metric.includes('utilization')) {
      existing.saturation = signal.value;
    }
    existing.lastSignalAt = signal.timestamp;
    this.health.set(signal.assetId, existing);
  }

  buildInsight(serviceId: string, environmentId: string): PredictiveInsight | undefined {
    const context = this.knowledgeGraph.queryService(serviceId);
    if (!context) {
      return undefined;
    }
    const serviceRisk = context.risk ?? this.snapshotRisk(serviceId);
    const readinessScore = this.calculateReadiness(serviceRisk, serviceId);
    const insightLevel = this.calculateInsightLevel(serviceRisk);
    const recommendations = this.buildRecommendations(
      serviceRisk,
      serviceId,
      environmentId,
    );

    return {
      serviceId,
      environmentId,
      riskScore: serviceRisk?.score ?? 0,
      readinessScore,
      insightLevel,
      recommendations,
      lastUpdated: new Date(),
    };
  }

  listHighRiskInsights(limit = 5): PredictiveInsight[] {
    const snapshot = this.knowledgeGraph.snapshot();
    return Object.entries(snapshot.serviceRisk)
      .filter(([, profile]) => profile.score >= this.riskThresholds.medium)
      .sort(([, a], [, b]) => b.score - a.score)
      .slice(0, limit)
      .map(([serviceId, profile]) => {
        const environmentId = this.knowledgeGraph.queryService(serviceId)?.environments?.[0]?.id ?? 'unknown';
        return this.buildInsight(serviceId, environmentId) ?? {
          serviceId,
          environmentId,
          riskScore: profile.score,
          readinessScore: this.calculateReadiness(profile, serviceId),
          insightLevel: this.calculateInsightLevel(profile),
          recommendations: [],
          lastUpdated: new Date(),
        };
      });
  }

  private snapshotRisk(serviceId: string): ServiceRiskProfile | undefined {
    const snapshot = this.knowledgeGraph.snapshot();
    return snapshot.serviceRisk[serviceId];
  }

  private calculateInsightLevel(profile: ServiceRiskProfile | undefined): InsightLevel {
    const score = profile?.score ?? 0;
    if (score >= this.riskThresholds.high) {
      return 'high';
    }
    if (score >= this.riskThresholds.medium) {
      return 'medium';
    }
    return 'low';
  }

  private calculateReadiness(profile: ServiceRiskProfile | undefined, serviceId: string): number {
    const risk = 1 - (profile?.score ?? 0);
    const health = this.health.get(serviceId);
    const latencyFactor = health?.latencyMs ? Math.max(0, 1 - health.latencyMs / 2000) : 1;
    const errorFactor = health?.errorRate ? Math.max(0, 1 - health.errorRate * 5) : 1;
    const saturationFactor = health?.saturation ? Math.max(0, 1 - health.saturation) : 1;
    const costFactor = this.costGuard ? Math.max(0, 1 - this.costGuard.metrics.budgetsExceeded / 10) : 1;
    return Number(
      Math.min(1, Math.max(0, (risk * 0.5 + latencyFactor * 0.2 + errorFactor * 0.2 + saturationFactor * 0.05 + costFactor * 0.05))).toFixed(3),
    );
  }

  private buildRecommendations(
    profile: ServiceRiskProfile | undefined,
    serviceId: string,
    environmentId: string,
  ): string[] {
    const recommendations: string[] = [];
    if (!profile) {
      recommendations.push('Refresh knowledge graph snapshot before executing high-impact changes.');
      return recommendations;
    }
    if (profile.factors.incidentLoad > 1) {
      recommendations.push('Run rehearsal of self-healing playbooks prior to deployment.');
    }
    if (profile.factors.costPressure > 0.5) {
      recommendations.push('Engage cost guard to validate scaling or provisioning requests.');
    }
    if (profile.score >= this.riskThresholds.high) {
      recommendations.push('Require senior approver sign-off and schedule during low-traffic window.');
    }
    const health = this.health.get(serviceId);
    if (health?.latencyMs && health.latencyMs > 1500) {
      recommendations.push('Latency trending high; consider canary rollout with throttled traffic.');
    }
    if (health?.saturation && health.saturation > 0.85) {
      recommendations.push('Capacity saturation detected; pre-scale infrastructure.');
    }
    recommendations.push(`Capture release readiness survey for ${serviceId} in ${environmentId}.`);
    return recommendations;
  }
}

export type { PredictiveInsightEngineOptions };
