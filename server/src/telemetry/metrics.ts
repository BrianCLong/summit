/**
 * Metrics Collection for IntelGraph Maestro
 * Wraps monitoring/metrics.js to provide backward compatibility and a clean interface.
 */
import logger from '../utils/logger.js';
import {
  maestroOrchestrationRequests,
  maestroOrchestrationDuration,
  maestroOrchestrationErrors,
  maestroActiveConnections,
  maestroActiveSessions,
  maestroAiModelRequests,
  maestroAiModelDuration,
  maestroAiModelErrors,
  maestroAiModelCosts,
  maestroThompsonSamplingRewards,
  maestroGraphOperations,
  maestroGraphQueryDuration,
  maestroGraphConnections,
  maestroGraphEntities,
  maestroGraphRelations,
  maestroPremiumRoutingDecisions,
  maestroPremiumBudgetUtilization,
  maestroPremiumCostSavings,
  maestroSecurityEvents,
  maestroComplianceGateDecisions,
  maestroAuthenticationAttempts,
  maestroAuthorizationDecisions,
  maestroInvestigationsCreated,
  maestroDataSourcesActive,
  maestroWebScrapingRequests,
  maestroSynthesisOperations,
  memoryUsage
} from '../monitoring/metrics.js';

/**
 * IntelGraph Metrics Manager
 */
export class IntelGraphMetrics {
  private static instance: IntelGraphMetrics;

  private constructor() {
    // Metrics initialization handled in monitoring/metrics.ts
    logger.info('IntelGraphMetrics initialized (backed by prom-client).');
  }

  public static getInstance(): IntelGraphMetrics {
    if (!IntelGraphMetrics.instance) {
      IntelGraphMetrics.instance = new IntelGraphMetrics();
    }
    return IntelGraphMetrics.instance;
  }

  // Public API Methods
  public recordOrchestrationRequest(
    method: string,
    endpoint: string,
    status: string,
  ): void {
    maestroOrchestrationRequests.inc({ method, endpoint, status });
  }

  public recordOrchestrationDuration(duration: number, endpoint: string): void {
    maestroOrchestrationDuration.observe({ endpoint }, duration);
  }

  public recordOrchestrationError(error: string, endpoint: string): void {
    maestroOrchestrationErrors.inc({ error_type: error, endpoint });
  }

  public recordAIModelRequest(
    model: string,
    operation: string,
    status: string,
    cost: number = 0,
  ): void {
    maestroAiModelRequests.inc({ model, operation, status });
    if (cost > 0) {
      maestroAiModelCosts.observe({ model, operation }, cost);
    }
  }

  public recordAIModelDuration(
    duration: number,
    model: string,
    operation: string,
  ): void {
    maestroAiModelDuration.observe({ model, operation }, duration);
  }

  public updateThompsonSamplingReward(model: string, rewardRate: number): void {
    maestroThompsonSamplingRewards.set({ model }, rewardRate);
  }

  public recordGraphOperation(
    operation: string,
    status: string,
    duration: number,
  ): void {
    maestroGraphOperations.inc({ operation, status });
    maestroGraphQueryDuration.observe({ operation }, duration);
  }

  public updateGraphEntityCount(count: number, entityType?: string): void {
    maestroGraphEntities.set({ entity_type: entityType || 'all' }, count);
  }

  public recordPremiumRoutingDecision(
    decision: string,
    modelTier: string,
    cost: number,
  ): void {
    maestroPremiumRoutingDecisions.inc({ decision, model_tier: modelTier });
    if (decision === 'downgrade') {
      maestroPremiumCostSavings.inc({ model_tier: modelTier }, cost);
    }
  }

  public updatePremiumBudgetUtilization(percentage: number): void {
    maestroPremiumBudgetUtilization.set(percentage);
  }

  public recordSecurityEvent(
    eventType: string,
    severity: string,
    userId?: string,
  ): void {
    maestroSecurityEvents.inc({
      event_type: eventType,
      severity,
      user_id: userId || 'anonymous',
    });
  }

  public recordComplianceDecision(
    decision: string,
    policy: string,
    reason?: string,
  ): void {
    maestroComplianceGateDecisions.inc({
      decision,
      policy,
      reason: reason || 'none',
    });
  }

  public recordAuthenticationAttempt(
    method: string,
    status: string,
    userId?: string,
  ): void {
    maestroAuthenticationAttempts.inc({
      auth_method: method,
      status,
      user_id: userId || 'anonymous',
    });
  }

  public recordInvestigationCreated(type: string, userId: string): void {
    maestroInvestigationsCreated.inc({
      investigation_type: type,
      user_id: userId,
    });
  }

  public updateActiveDataSources(count: number, sourceType?: string): void {
    maestroDataSourcesActive.set({ source_type: sourceType || 'all' }, count);
  }

  public recordWebScrapingRequest(status: string, domain?: string): void {
    maestroWebScrapingRequests.inc({
      status,
      domain: domain || 'unknown',
    });
  }

  public updateActiveConnections(
    delta: number,
    connectionType: string = 'http',
  ): void {
    if (delta > 0) {
        maestroActiveConnections.inc({ type: connectionType }, delta);
    } else {
        maestroActiveConnections.dec({ type: connectionType }, Math.abs(delta));
    }
  }

  public updateActiveSessions(
    delta: number,
    sessionType: string = 'user',
  ): void {
    if (delta > 0) {
        maestroActiveSessions.inc({ type: sessionType }, delta);
    } else {
        maestroActiveSessions.dec({ type: sessionType }, Math.abs(delta));
    }
  }

  public async shutdown(): Promise<void> {
    /* no-op */
  }
}

const metricsInstance = IntelGraphMetrics.getInstance();

process.on('SIGTERM', async () => {
  await metricsInstance.shutdown();
});

export default metricsInstance;
