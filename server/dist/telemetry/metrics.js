/**
 * No-op Metrics Collection for IntelGraph Maestro (OTel disabled)
 * Preserves API compatibility without external dependencies.
 */
import logger from '../utils/logger.js';
/**
 * IntelGraph Metrics Manager
 */
export class IntelGraphMetrics {
    static instance;
    meter;
    // Core Application Metrics
    orchestrationRequests;
    orchestrationDuration;
    orchestrationErrors;
    activeConnections;
    activeSessions;
    // AI Model Metrics
    aiModelRequests;
    aiModelDuration;
    aiModelErrors;
    aiModelCosts;
    thompsonSamplingRewards;
    // Graph Database Metrics
    graphOperations;
    graphQueryDuration;
    graphConnections;
    graphEntities;
    graphRelations;
    // Premium Routing Metrics
    premiumRoutingDecisions;
    premiumBudgetUtilization;
    premiumCostSavings;
    // Security Metrics
    securityEvents;
    complianceGateDecisions;
    authenticationAttempts;
    authorizationDecisions;
    // Business Metrics
    investigationsCreated;
    dataSourcesActive;
    webScrapingRequests;
    synthesisOperations;
    // System Metrics
    memoryUsage;
    cpuUsage;
    constructor() {
        this.setupMetrics();
    }
    static getInstance() {
        if (!IntelGraphMetrics.instance) {
            IntelGraphMetrics.instance = new IntelGraphMetrics();
        }
        return IntelGraphMetrics.instance;
    }
    setupMetrics() {
        // No-op meter factory
        const noopInstrument = {
            add: (_v, _attrs) => { },
            record: (_v, _attrs) => { },
            set: (_v, _attrs) => { },
        };
        const noopObservable = { addCallback: (_cb) => { } };
        this.meter = {
            createCounter: (_, __) => ({ ...noopInstrument }),
            createHistogram: (_, __) => ({ ...noopInstrument }),
            createGauge: (_, __) => ({ ...noopInstrument }),
            createUpDownCounter: (_, __) => ({ ...noopInstrument }),
            createObservableGauge: (_, __) => ({ ...noopObservable }),
        };
        this.initializeMetrics();
        this.setupSystemMetrics();
        logger.info('Metrics disabled (no-op).');
    }
    initializeMetrics() {
        // Orchestration Metrics
        this.orchestrationRequests = this.meter.createCounter('maestro_orchestration_requests_total', {
            description: 'Total number of orchestration requests',
        });
        this.orchestrationDuration = this.meter.createHistogram('maestro_orchestration_duration_seconds', {
            description: 'Duration of orchestration requests',
            boundaries: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
        });
        this.orchestrationErrors = this.meter.createCounter('maestro_orchestration_errors_total', {
            description: 'Total number of orchestration errors',
        });
        this.activeConnections = this.meter.createUpDownCounter('maestro_active_connections', {
            description: 'Number of active connections',
        });
        this.activeSessions = this.meter.createUpDownCounter('maestro_active_sessions_total', {
            description: 'Number of active user sessions',
        });
        // AI Model Metrics
        this.aiModelRequests = this.meter.createCounter('maestro_ai_model_requests_total', {
            description: 'Total AI model requests by model type',
        });
        this.aiModelDuration = this.meter.createHistogram('maestro_ai_model_response_time_seconds', {
            description: 'AI model response time',
            boundaries: [0.1, 0.5, 1, 2, 5, 10, 20, 30],
        });
        this.aiModelErrors = this.meter.createCounter('maestro_ai_model_errors_total', {
            description: 'Total AI model errors',
        });
        this.aiModelCosts = this.meter.createHistogram('maestro_ai_model_cost_usd', {
            description: 'Cost per AI model request in USD',
            boundaries: [0.001, 0.01, 0.1, 1, 5, 10, 50],
        });
        this.thompsonSamplingRewards = this.meter.createGauge('maestro_thompson_sampling_reward_rate', {
            description: 'Thompson sampling reward rate by model',
        });
        // Graph Database Metrics
        this.graphOperations = this.meter.createCounter('maestro_graph_operations_total', {
            description: 'Total graph database operations',
        });
        this.graphQueryDuration = this.meter.createHistogram('maestro_graph_query_duration_seconds', {
            description: 'Graph query execution time',
            boundaries: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
        });
        this.graphConnections = this.meter.createUpDownCounter('maestro_graph_connections_active', {
            description: 'Active Neo4j connections',
        });
        this.graphEntities = this.meter.createUpDownCounter('maestro_graph_entities_total', {
            description: 'Total entities in graph database',
        });
        this.graphRelations = this.meter.createUpDownCounter('maestro_graph_relations_total', {
            description: 'Total relations in graph database',
        });
        // Premium Routing Metrics
        this.premiumRoutingDecisions = this.meter.createCounter('maestro_premium_routing_decisions_total', {
            description: 'Premium routing decisions',
        });
        this.premiumBudgetUtilization = this.meter.createGauge('maestro_premium_budget_utilization_percent', {
            description: 'Premium model budget utilization percentage',
        });
        this.premiumCostSavings = this.meter.createCounter('maestro_premium_cost_savings_usd', {
            description: 'Cost savings from premium routing',
        });
        // Security Metrics
        this.securityEvents = this.meter.createCounter('maestro_security_events_total', {
            description: 'Security events by type',
        });
        this.complianceGateDecisions = this.meter.createCounter('maestro_compliance_gate_decisions_total', {
            description: 'Compliance gate decisions',
        });
        this.authenticationAttempts = this.meter.createCounter('maestro_authentication_attempts_total', {
            description: 'Authentication attempts',
        });
        this.authorizationDecisions = this.meter.createCounter('maestro_authorization_decisions_total', {
            description: 'Authorization decisions',
        });
        // Business Metrics
        this.investigationsCreated = this.meter.createCounter('maestro_investigations_created_total', {
            description: 'Total investigations created',
        });
        this.dataSourcesActive = this.meter.createUpDownCounter('maestro_data_sources_active_total', {
            description: 'Number of active data sources',
        });
        this.webScrapingRequests = this.meter.createCounter('maestro_web_scraping_requests_total', {
            description: 'Web scraping requests',
        });
        this.synthesisOperations = this.meter.createCounter('maestro_synthesis_operations_total', {
            description: 'Data synthesis operations',
        });
    }
    setupSystemMetrics() {
        // Memory usage
        this.memoryUsage = this.meter.createObservableGauge('maestro_memory_usage_bytes', {
            description: 'Memory usage in bytes',
        });
        // no-op
        // CPU usage
        this.cpuUsage = this.meter.createObservableGauge('maestro_cpu_usage_percent', {
            description: 'CPU usage percentage',
        });
        // no-op
        // Event loop lag
        const eventLoopLag = this.meter.createObservableGauge('maestro_event_loop_lag_seconds', {
            description: 'Event loop lag in seconds',
        });
        // no-op
    }
    // Public API Methods
    recordOrchestrationRequest(method, endpoint, status) {
        this.orchestrationRequests.add(1, { method, endpoint, status });
    }
    recordOrchestrationDuration(duration, endpoint) {
        this.orchestrationDuration.record(duration, { endpoint });
    }
    recordOrchestrationError(error, endpoint) {
        this.orchestrationErrors.add(1, { error_type: error, endpoint });
    }
    recordAIModelRequest(model, operation, status, cost = 0) {
        this.aiModelRequests.add(1, { model, operation, status });
        if (cost > 0) {
            this.aiModelCosts.record(cost, { model, operation });
        }
    }
    recordAIModelDuration(duration, model, operation) {
        this.aiModelDuration.record(duration, { model, operation });
    }
    updateThompsonSamplingReward(model, rewardRate) {
        this.thompsonSamplingRewards.set(rewardRate, { model });
    }
    recordGraphOperation(operation, status, duration) {
        this.graphOperations.add(1, { operation, status });
        this.graphQueryDuration.record(duration, { operation });
    }
    updateGraphEntityCount(count, entityType) {
        this.graphEntities.add(count, { entity_type: entityType || 'all' });
    }
    recordPremiumRoutingDecision(decision, modelTier, cost) {
        this.premiumRoutingDecisions.add(1, { decision, model_tier: modelTier });
        if (decision === 'downgrade') {
            this.premiumCostSavings.add(cost, { model_tier: modelTier });
        }
    }
    updatePremiumBudgetUtilization(percentage) {
        this.premiumBudgetUtilization.set(percentage);
    }
    recordSecurityEvent(eventType, severity, userId) {
        this.securityEvents.add(1, {
            event_type: eventType,
            severity,
            user_id: userId || 'anonymous',
        });
    }
    recordComplianceDecision(decision, policy, reason) {
        this.complianceGateDecisions.add(1, {
            decision,
            policy,
            reason: reason || 'none',
        });
    }
    recordAuthenticationAttempt(method, status, userId) {
        this.authenticationAttempts.add(1, {
            auth_method: method,
            status,
            user_id: userId || 'anonymous',
        });
    }
    recordInvestigationCreated(type, userId) {
        this.investigationsCreated.add(1, {
            investigation_type: type,
            user_id: userId,
        });
    }
    updateActiveDataSources(count, sourceType) {
        this.dataSourcesActive.add(count, { source_type: sourceType || 'all' });
    }
    recordWebScrapingRequest(status, domain) {
        this.webScrapingRequests.add(1, {
            status,
            domain: domain || 'unknown',
        });
    }
    updateActiveConnections(delta, connectionType = 'http') {
        this.activeConnections.add(delta, { type: connectionType });
    }
    updateActiveSessions(delta, sessionType = 'user') {
        this.activeSessions.add(delta, { type: sessionType });
    }
    async shutdown() {
        /* no-op */
    }
}
const metricsInstance = IntelGraphMetrics.getInstance();
process.on('SIGTERM', async () => {
    await metricsInstance.shutdown();
});
export default metricsInstance;
//# sourceMappingURL=metrics.js.map