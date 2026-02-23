import { TaskOrchestrator, EventBus, ArchitectureDesignRunner, TenantOnboardingRunner } from '@intelgraph/maestro-core';
import { InMemoryGraphAdapter, GraphQueryAPI } from '@intelgraph/core';
import { TenantRegistry } from '@intelgraph/maas';
import { DetectionEngine, IncidentCorrelator } from '@intelgraph/securiteyes';
import { MetricsEngine } from '@intelgraph/summitsight';

describe('Phase-1 End-to-End Integration', () => {
  let eventBus: EventBus;
  let graphAdapter: InMemoryGraphAdapter;
  let graphApi: GraphQueryAPI;
  let orchestrator: TaskOrchestrator;
  let tenantRegistry: TenantRegistry;
  let detectionEngine: DetectionEngine;
  let correlator: IncidentCorrelator;
  let metricsEngine: MetricsEngine;

  beforeEach(() => {
    // Setup subsystems
    eventBus = new EventBus();
    graphAdapter = new InMemoryGraphAdapter();
    graphApi = new GraphQueryAPI(graphAdapter);

    orchestrator = new TaskOrchestrator(eventBus, graphAdapter);
    orchestrator.registerRunner(new ArchitectureDesignRunner());
    orchestrator.registerRunner(new TenantOnboardingRunner());

    tenantRegistry = new TenantRegistry(graphAdapter);

    detectionEngine = new DetectionEngine();
    correlator = new IncidentCorrelator(graphAdapter);
    metricsEngine = new MetricsEngine();

    // Wire up metrics
    eventBus.subscribe('TASK_CREATED', (e) => metricsEngine.ingestMaestroEvent(e));
    eventBus.subscribe('TASK_STARTED', (e) => metricsEngine.ingestMaestroEvent(e));
    eventBus.subscribe('TASK_COMPLETED', (e) => metricsEngine.ingestMaestroEvent(e));
    eventBus.subscribe('TASK_BLOCKED', (e) => metricsEngine.ingestMaestroEvent(e));
  });

  test('Flow 8.1: Tenant Onboarding', async () => {
    // 1. Create Tenant (Governance Check inside)
    const tenant = await tenantRegistry.createTenant('Acme Corp', ['analytics'], 'us-east-1');
    expect(tenant).toBeDefined();
    expect(tenant?.name).toBe('Acme Corp');

    // 2. Trigger Onboarding Task via Maestro
    const task = await orchestrator.createTask(tenant!.id, 'TENANT_ONBOARDING', { requestedTenantId: tenant!.id }, 'analytics');

    // 3. Verify Graph
    const tasks = await graphApi.getTasksForTenant(tenant!.id);
    expect(tasks.length).toBe(1);
    expect(tasks[0].id).toBe(task.id);

    // 4. Verify Metrics
    await new Promise(r => setTimeout(r, 10)); // Allow events to propagate
    const successRate = metricsEngine.computeTaskSuccessRate();
    // Task started but maybe finished? Orchestrator dispatches async.
    // The simple orchestrator dispatches and awaits runner. So it should be completed.
    expect(task.status).toBe('COMPLETED');
    expect(successRate.value).toBe(100);
  });

  test('Flow 8.2: Maestro Task Execution & Governance Block', async () => {
    const tenantId = 'tenant-123';

    // Green Task
    const allowedTask = await orchestrator.createTask(tenantId, 'ARCHITECTURE_DESIGN', {}, 'defensive_security');
    expect(allowedTask.status).not.toBe('BLOCKED_BY_GOVERNANCE');

    // Red Task
    const blockedTask = await orchestrator.createTask(tenantId, 'PSYOPS_CAMPAIGN', {}, 'influence_operations');
    expect(blockedTask.status).toBe('BLOCKED_BY_GOVERNANCE');

    // Verify Graph for Blocked Decision
    const decisions = await graphApi.getGovernanceDecisionsForTenant(tenantId);
    expect(decisions.length).toBe(1);
    expect(decisions[0].properties.outcome).toBe('DENIED');

    // Verify Metrics
    await new Promise(r => setTimeout(r, 10));
    const blockRate = metricsEngine.computeGovernanceBlockRate();
    expect(blockRate.value).toBe(50); // 1 allowed, 1 blocked
  });

  test('Flow 8.3: Securiteyes Incident', async () => {
    // 1. Detect
    const events = detectionEngine.run({
      eventType: 'LOGIN_FAILURE',
      count: 10,
      ip: '10.0.0.1',
      timestamp: new Date()
    });
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('EXCESSIVE_LOGIN_FAILURES');

    // 2. Correlate
    const incident = await correlator.correlate(events);
    expect(incident).toBeDefined();
    expect(incident?.severity).toBe('MEDIUM');

    // 3. Verify Graph
    const incidentNodes = await graphAdapter.queryNodes('Incident');
    expect(incidentNodes.length).toBe(1);
    expect(incidentNodes[0].id).toBe(incident?.id);

    // 4. Metrics
    metricsEngine.ingestIncident(incident!);
    const velocity = metricsEngine.computeIncidentVelocity();
    expect(velocity.value).toBe(1);
  });
});
