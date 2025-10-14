import { Logger } from '../../utils/logger';
import { MetricsCollector } from '../../observability/MetricsCollector';
import type { RollbackTrigger, RollbackDecision, RollbackImpact } from './IntelligentRollbackSystem';
import type { DeploymentHealthMetrics } from './HealthMonitor';

interface TriggerEvaluation {
  trigger: RollbackTrigger;
  reason: string;
}

interface BaselineMetrics {
  error_rate: number;
  success_rate: number;
  avg_latency: number;
  memory_usage: number;
  saturation: number;
}

interface DeploymentContext {
  deploymentId: string;
  environment: string;
  services: string[];
  defaultStrategy?: string;
  baseline: BaselineMetrics;
  decisionHistory: Array<{ timestamp: Date; decision: string; confidence: number }>;
  lastUpdated: Date;
}

const SEVERITY_WEIGHTS: Record<RollbackTrigger['severity'], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 5
};

export class RollbackDecisionEngine {
  private logger: Logger;
  private metrics?: MetricsCollector;
  private contexts: Map<string, DeploymentContext> = new Map();

  constructor(logger: Logger, metricsCollector?: MetricsCollector) {
    this.logger = logger;
    this.metrics = metricsCollector;
  }

  async initialize(): Promise<void> {
    this.logger.info('RollbackDecisionEngine initialized');
  }

  async registerDeployment(
    deploymentId: string,
    config: {
      services: string[];
      environment: string;
      rollbackStrategy?: string;
    }
  ): Promise<void> {
    const context: DeploymentContext = {
      deploymentId,
      environment: config.environment,
      services: config.services,
      defaultStrategy: config.rollbackStrategy,
      baseline: {
        error_rate: 0.01,
        success_rate: 0.99,
        avg_latency: 300,
        memory_usage: 0.55,
        saturation: 0.45
      },
      decisionHistory: [],
      lastUpdated: new Date()
    };

    this.contexts.set(deploymentId, context);
    this.logger.info(`Registered deployment ${deploymentId} with rollback decision engine`, {
      environment: config.environment,
      services: config.services,
      defaultStrategy: config.rollbackStrategy
    });
  }

  async makeDecision(
    deploymentId: string,
    triggeredConditions: TriggerEvaluation[],
    healthMetrics: DeploymentHealthMetrics
  ): Promise<RollbackDecision> {
    const context = this.contexts.get(deploymentId);
    if (!context) {
      throw new Error(`Deployment ${deploymentId} has not been registered with the decision engine`);
    }

    const severityScore = this.calculateSeverityScore(triggeredConditions);
    const driftScore = this.calculateMetricDrift(context, healthMetrics);
    const combinedScore = severityScore + driftScore;

    let decisionType: RollbackDecision['decision'];
    if (combinedScore >= 5 || healthMetrics.status === 'critical') {
      decisionType = 'rollback';
    } else if (combinedScore <= 1 && healthMetrics.status === 'healthy') {
      decisionType = 'continue';
    } else {
      decisionType = 'hold';
    }

    const strategy = this.determineStrategy(
      context,
      healthMetrics,
      triggeredConditions,
      decisionType
    );

    const confidence = this.calculateConfidence(severityScore, driftScore, triggeredConditions.length);
    const reasons = triggeredConditions.map(condition => `${condition.trigger.name}: ${condition.reason}`);

    if (driftScore > 0.5) {
      reasons.push(`Operational drift detected: score ${driftScore.toFixed(2)}`);
    }

    const impact = this.estimateImpact(context, healthMetrics, triggeredConditions, strategy);

    const decision: RollbackDecision = {
      deploymentId,
      decision: decisionType,
      strategy,
      confidence,
      reasons,
      triggeredBy: triggeredConditions.map(condition => condition.trigger.id),
      estimatedImpact: impact,
      timestamp: new Date()
    };

    context.decisionHistory.push({
      timestamp: decision.timestamp,
      decision: decision.decision,
      confidence: decision.confidence
    });
    if (context.decisionHistory.length > 25) {
      context.decisionHistory.shift();
    }
    context.lastUpdated = new Date();

    this.metrics?.incrementCounter?.('maestro.rollback.decisions', {
      decision: decision.decision,
      strategy: decision.strategy,
      environment: context.environment
    });
    this.metrics?.recordGauge?.('maestro.rollback.confidence', decision.confidence, {
      deploymentId,
      strategy: decision.strategy
    });
    this.metrics?.recordHistogram?.('maestro.rollback.severity_score', severityScore, {
      deploymentId
    });

    this.logger.info(`Decision engine output for ${deploymentId}`, {
      decision: decision.decision,
      strategy: decision.strategy,
      confidence: decision.confidence,
      reasons: decision.reasons
    });

    return decision;
  }

  private calculateSeverityScore(triggeredConditions: TriggerEvaluation[]): number {
    if (triggeredConditions.length === 0) {
      return 0;
    }

    return triggeredConditions.reduce((score, evaluation) => {
      return score + (SEVERITY_WEIGHTS[evaluation.trigger.severity] || 1);
    }, 0);
  }

  private calculateMetricDrift(context: DeploymentContext, health: DeploymentHealthMetrics): number {
    const drift = {
      error: Math.max(0, (health.error_rate - context.baseline.error_rate) / context.baseline.error_rate),
      latency: Math.max(0, (health.avg_latency - context.baseline.avg_latency) / context.baseline.avg_latency),
      saturation: Math.max(0, (health.saturation - context.baseline.saturation) / context.baseline.saturation),
      availability: Math.max(0, (context.baseline.success_rate - health.success_rate) / context.baseline.success_rate)
    };

    const weighted = (drift.error * 0.35) + (drift.latency * 0.25) + (drift.saturation * 0.2) + (drift.availability * 0.2);
    return Math.min(5, weighted * 5);
  }

  private determineStrategy(
    context: DeploymentContext,
    health: DeploymentHealthMetrics,
    triggeredConditions: TriggerEvaluation[],
    decision: RollbackDecision['decision']
  ): RollbackDecision['strategy'] {
    if (decision !== 'rollback') {
      return context.defaultStrategy || 'progressive';
    }

    const hasCritical = triggeredConditions.some(condition => condition.trigger.severity === 'critical');
    if (hasCritical || health.status === 'critical' || health.memory_usage > 0.9) {
      return 'immediate';
    }

    const latencyTrigger = triggeredConditions.find(condition =>
      condition.trigger.condition.metric === 'avg_latency' ||
      condition.trigger.condition.metric === 'saturation'
    );
    if (latencyTrigger) {
      return 'traffic_shift';
    }

    const serviceMetrics = health.serviceMetrics || [];
    const canaryIssues = serviceMetrics.filter(metric => metric.tier === 'canary' && metric.status !== 'healthy');
    const primaryIssues = serviceMetrics.filter(metric => metric.tier === 'primary' && metric.status !== 'healthy');

    if (canaryIssues.length > 0 && primaryIssues.length === 0) {
      return 'canary_only';
    }

    return 'progressive';
  }

  private calculateConfidence(severity: number, drift: number, triggeredCount: number): number {
    const normalizedSeverity = Math.min(1, severity / 6);
    const normalizedDrift = Math.min(1, drift / 4);
    const signalConfidence = Math.min(1, triggeredCount * 0.15);

    const confidence = 0.3 + (normalizedSeverity * 0.35) + (normalizedDrift * 0.25) + (signalConfidence * 0.1);
    return Number(Math.min(1, confidence).toFixed(2));
  }

  private estimateImpact(
    context: DeploymentContext,
    health: DeploymentHealthMetrics,
    triggeredConditions: TriggerEvaluation[],
    strategy: RollbackDecision['strategy']
  ): RollbackImpact {
    const impactedServices = new Set<string>();
    (health.serviceMetrics || []).forEach(metric => {
      if (metric.status !== 'healthy') {
        impactedServices.add(metric.serviceId);
      }
    });

    if (impactedServices.size === 0) {
      context.services.forEach(service => impactedServices.add(service));
    }

    const severityWeight = triggeredConditions.reduce((total, evaluation) => total + (SEVERITY_WEIGHTS[evaluation.trigger.severity] || 1), 0);
    const estimatedDowntime = strategy === 'immediate' ? 180 : strategy === 'progressive' ? 600 : 240;
    const userImpact = Math.min(100, Math.round((health.error_rate * 120) + ((1 - health.success_rate) * 100)));

    let dataLoss: RollbackImpact['dataLoss'] = 'none';
    if (health.memory_usage > 0.95 || severityWeight >= 8) {
      dataLoss = 'moderate';
    } else if (health.memory_usage > 0.9) {
      dataLoss = 'minimal';
    }

    const complexity = impactedServices.size > Math.ceil(context.services.length / 2) ? 'high' : impactedServices.size > 2 ? 'medium' : 'low';

    return {
      affectedServices: Array.from(impactedServices),
      estimatedDowntime,
      userImpact,
      dataLoss,
      rollbackComplexity: complexity
    };
  }
}
