/**
 * No-op Metrics Collection for IntelGraph Maestro (OTel disabled)
 * Preserves API compatibility without external dependencies.
 */
import logger from '../utils/logger.js';

/**
 * IntelGraph Metrics Manager
 */
export class IntelGraphMetrics {
  private static instance: IntelGraphMetrics;
  private meter: any;

  // Core Application Metrics
  private orchestrationRequests: any;
  private orchestrationDuration: any;
  private orchestrationErrors: any;
  private activeConnections: any;
  private activeSessions: any;

  // AI Model Metrics
  private aiModelRequests: any;
  private aiModelDuration: any;
  private aiModelErrors: any;
  private aiModelCosts: any;
  private thompsonSamplingRewards: any;

  // Graph Database Metrics
  private graphOperations: any;
  private graphQueryDuration: any;
  private graphConnections: any;
  private graphEntities: any;
  private graphRelations: any;

  // Premium Routing Metrics
  private premiumRoutingDecisions: any;
  private premiumBudgetUtilization: any;
  private premiumCostSavings: any;

  // Security Metrics
  private securityEvents: any;
  private complianceGateDecisions: any;
  private authenticationAttempts: any;
  private authorizationDecisions: any;

  // Business Metrics
  private investigationsCreated: any;
  private dataSourcesActive: any;
  private webScrapingRequests: any;
  private synthesisOperations: any;

  // System Metrics
  private memoryUsage: any;
  private cpuUsage: any;

  private constructor() {
    this.setupMetrics();
  }

  public static getInstance(): IntelGraphMetrics {
    if (!IntelGraphMetrics.instance) {
      IntelGraphMetrics.instance = new IntelGraphMetrics();
    }
    return IntelGraphMetrics.instance;
  }

  private setupMetrics(): void {
    // No-op meter factory
    const noopInstrument = {
      add: (_v: number, _attrs?: any) => {},
      record: (_v: number, _attrs?: any) => {},
      set: (_v: number, _attrs?: any) => {},
    };
    const noopObservable = { addCallback: (_cb: any) => {} };
    this.meter = {
      createCounter: (_: string, __?: any) => ({ ...noopInstrument }),
      createHistogram: (_: string, __?: any) => ({ ...noopInstrument }),
      createGauge: (_: string, __?: any) => ({ ...noopInstrument }),
      createUpDownCounter: (_: string, __?: any) => ({ ...noopInstrument }),
      createObservableGauge: (_: string, __?: any) => ({ ...noopObservable }),
    };

    this.initializeMetrics();
    this.setupSystemMetrics();
    logger.info('Metrics disabled (no-op).');
  }

  private initializeMetrics(): void {
    // Orchestration Metrics
    this.orchestrationRequests = this.meter.createCounter(
      'maestro_orchestration_requests_total',
      {
        description: 'Total number of orchestration requests',
      },
    );

    this.orchestrationDuration = this.meter.createHistogram(
      'maestro_orchestration_duration_seconds',
      {
        description: 'Duration of orchestration requests',
        boundaries: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
      },
    );

    this.orchestrationErrors = this.meter.createCounter(
      'maestro_orchestration_errors_total',
      {
        description: 'Total number of orchestration errors',
      },
    );

    this.activeConnections = this.meter.createUpDownCounter(
      'maestro_active_connections',
      {
        description: 'Number of active connections',
      },
    );

    this.activeSessions = this.meter.createUpDownCounter(
      'maestro_active_sessions_total',
      {
        description: 'Number of active user sessions',
      },
    );

    // AI Model Metrics
    this.aiModelRequests = this.meter.createCounter(
      'maestro_ai_model_requests_total',
      {
        description: 'Total AI model requests by model type',
      },
    );

    this.aiModelDuration = this.meter.createHistogram(
      'maestro_ai_model_response_time_seconds',
      {
        description: 'AI model response time',
        boundaries: [0.1, 0.5, 1, 2, 5, 10, 20, 30],
      },
    );

    this.aiModelErrors = this.meter.createCounter(
      'maestro_ai_model_errors_total',
      {
        description: 'Total AI model errors',
      },
    );

    this.aiModelCosts = this.meter.createHistogram(
      'maestro_ai_model_cost_usd',
      {
        description: 'Cost per AI model request in USD',
        boundaries: [0.001, 0.01, 0.1, 1, 5, 10, 50],
      },
    );

    this.thompsonSamplingRewards = this.meter.createGauge(
      'maestro_thompson_sampling_reward_rate',
      {
        description: 'Thompson sampling reward rate by model',
      },
    );

    // Graph Database Metrics
    this.graphOperations = this.meter.createCounter(
      'maestro_graph_operations_total',
      {
        description: 'Total graph database operations',
      },
    );

    this.graphQueryDuration = this.meter.createHistogram(
      'maestro_graph_query_duration_seconds',
      {
        description: 'Graph query execution time',
        boundaries: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      },
    );

    this.graphConnections = this.meter.createUpDownCounter(
      'maestro_graph_connections_active',
      {
        description: 'Active Neo4j connections',
      },
    );

    this.graphEntities = this.meter.createUpDownCounter(
      'maestro_graph_entities_total',
      {
        description: 'Total entities in graph database',
      },
    );

    this.graphRelations = this.meter.createUpDownCounter(
      'maestro_graph_relations_total',
      {
        description: 'Total relations in graph database',
      },
    );

    // Premium Routing Metrics
    this.premiumRoutingDecisions = this.meter.createCounter(
      'maestro_premium_routing_decisions_total',
      {
        description: 'Premium routing decisions',
      },
    );

    this.premiumBudgetUtilization = this.meter.createGauge(
      'maestro_premium_budget_utilization_percent',
      {
        description: 'Premium model budget utilization percentage',
      },
    );

    this.premiumCostSavings = this.meter.createCounter(
      'maestro_premium_cost_savings_usd',
      {
        description: 'Cost savings from premium routing',
      },
    );

    // Security Metrics
    this.securityEvents = this.meter.createCounter(
      'maestro_security_events_total',
      {
        description: 'Security events by type',
      },
    );

    this.complianceGateDecisions = this.meter.createCounter(
      'maestro_compliance_gate_decisions_total',
      {
        description: 'Compliance gate decisions',
      },
    );

    this.authenticationAttempts = this.meter.createCounter(
      'maestro_authentication_attempts_total',
      {
        description: 'Authentication attempts',
      },
    );

    this.authorizationDecisions = this.meter.createCounter(
      'maestro_authorization_decisions_total',
      {
        description: 'Authorization decisions',
      },
    );

    // Business Metrics
    this.investigationsCreated = this.meter.createCounter(
      'maestro_investigations_created_total',
      {
        description: 'Total investigations created',
      },
    );

    this.dataSourcesActive = this.meter.createUpDownCounter(
      'maestro_data_sources_active_total',
      {
        description: 'Number of active data sources',
      },
    );

    this.webScrapingRequests = this.meter.createCounter(
      'maestro_web_scraping_requests_total',
      {
        description: 'Web scraping requests',
      },
    );

    this.synthesisOperations = this.meter.createCounter(
      'maestro_synthesis_operations_total',
      {
        description: 'Data synthesis operations',
      },
    );
  }

  private setupSystemMetrics(): void {
    // Memory usage
    this.memoryUsage = this.meter.createObservableGauge(
      'maestro_memory_usage_bytes',
      {
        description: 'Memory usage in bytes',
      },
    );

    // no-op

    // CPU usage
    this.cpuUsage = this.meter.createObservableGauge(
      'maestro_cpu_usage_percent',
      {
        description: 'CPU usage percentage',
      },
    );

    // no-op

    // Event loop lag
    const eventLoopLag = this.meter.createObservableGauge(
      'maestro_event_loop_lag_seconds',
      {
        description: 'Event loop lag in seconds',
      },
    );

    // no-op
  }

  // Public API Methods
  public recordOrchestrationRequest(
    method: string,
    endpoint: string,
    status: string,
  ): void {
    this.orchestrationRequests.add(1, { method, endpoint, status });
  }

  public recordOrchestrationDuration(duration: number, endpoint: string): void {
    this.orchestrationDuration.record(duration, { endpoint });
  }

  public recordOrchestrationError(error: string, endpoint: string): void {
    this.orchestrationErrors.add(1, { error_type: error, endpoint });
  }

  public recordAIModelRequest(
    model: string,
    operation: string,
    status: string,
    cost: number = 0,
  ): void {
    this.aiModelRequests.add(1, { model, operation, status });
    if (cost > 0) {
      this.aiModelCosts.record(cost, { model, operation });
    }
  }

  public recordAIModelDuration(
    duration: number,
    model: string,
    operation: string,
  ): void {
    this.aiModelDuration.record(duration, { model, operation });
  }

  public updateThompsonSamplingReward(model: string, rewardRate: number): void {
    this.thompsonSamplingRewards.set(rewardRate, { model });
  }

  public recordGraphOperation(
    operation: string,
    status: string,
    duration: number,
  ): void {
    this.graphOperations.add(1, { operation, status });
    this.graphQueryDuration.record(duration, { operation });
  }

  public updateGraphEntityCount(count: number, entityType?: string): void {
    this.graphEntities.add(count, { entity_type: entityType || 'all' });
  }

  public recordPremiumRoutingDecision(
    decision: string,
    modelTier: string,
    cost: number,
  ): void {
    this.premiumRoutingDecisions.add(1, { decision, model_tier: modelTier });
    if (decision === 'downgrade') {
      this.premiumCostSavings.add(cost, { model_tier: modelTier });
    }
  }

  public updatePremiumBudgetUtilization(percentage: number): void {
    this.premiumBudgetUtilization.set(percentage);
  }

  public recordSecurityEvent(
    eventType: string,
    severity: string,
    userId?: string,
  ): void {
    this.securityEvents.add(1, {
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
    this.complianceGateDecisions.add(1, {
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
    this.authenticationAttempts.add(1, {
      auth_method: method,
      status,
      user_id: userId || 'anonymous',
    });
  }

  public recordInvestigationCreated(type: string, userId: string): void {
    this.investigationsCreated.add(1, {
      investigation_type: type,
      user_id: userId,
    });
  }

  public updateActiveDataSources(count: number, sourceType?: string): void {
    this.dataSourcesActive.add(count, { source_type: sourceType || 'all' });
  }

  public recordWebScrapingRequest(status: string, domain?: string): void {
    this.webScrapingRequests.add(1, {
      status,
      domain: domain || 'unknown',
    });
  }

  public updateActiveConnections(
    delta: number,
    connectionType: string = 'http',
  ): void {
    this.activeConnections.add(delta, { type: connectionType });
  }

  public updateActiveSessions(
    delta: number,
    sessionType: string = 'user',
  ): void {
    this.activeSessions.add(delta, { type: sessionType });
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
