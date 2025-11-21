/**
 * Unit Tests for Notifications Hub
 */

import {
  EventBuilder,
  EventType,
  EventSeverity,
  EventStatus,
  EventHelpers,
  type CanonicalEvent,
} from '../../notifications-hub/events/EventSchema.js';
import { NotificationHub } from '../../notifications-hub/NotificationHub.js';
import { TemplateRegistry } from '../../notifications-hub/templates/TemplateRegistry.js';
import {
  PreferencesManager,
  InMemoryPreferencesStorage,
} from '../../notifications-hub/preferences/PreferencesManager.js';
import {
  AlertingEventAdapter,
  PipelineEventAdapter,
  CopilotEventAdapter,
  AuthorityEventAdapter,
  AdapterRegistry,
} from '../../notifications-hub/adapters/EventAdapters.js';

describe('EventSchema', () => {
  describe('EventBuilder', () => {
    it('should create a valid canonical event', () => {
      const event = new EventBuilder()
        .type(EventType.ALERT_TRIGGERED)
        .severity(EventSeverity.HIGH)
        .actor(EventHelpers.systemActor('Test System'))
        .subject({
          type: 'alert',
          id: 'alert-123',
          name: 'Test Alert',
          url: 'https://example.com/alerts/123',
        })
        .context({
          tenantId: 'tenant-1',
          projectId: 'project-1',
          environment: 'production',
        })
        .title('Test Alert Triggered')
        .message('This is a test alert message')
        .payload({ key: 'value' })
        .source('test-source')
        .correlationId('corr-123')
        .build();

      expect(event.id).toBeDefined();
      expect(event.type).toBe(EventType.ALERT_TRIGGERED);
      expect(event.severity).toBe(EventSeverity.HIGH);
      expect(event.status).toBe(EventStatus.PENDING);
      expect(event.actor.name).toBe('Test System');
      expect(event.actor.type).toBe('system');
      expect(event.subject.id).toBe('alert-123');
      expect(event.context.tenantId).toBe('tenant-1');
      expect(event.title).toBe('Test Alert Triggered');
      expect(event.message).toBe('This is a test alert message');
      expect(event.payload.key).toBe('value');
      expect(event.metadata?.source).toBe('test-source');
      expect(event.metadata?.correlationId).toBe('corr-123');
    });

    it('should throw error when required fields are missing', () => {
      expect(() => {
        new EventBuilder()
          .type(EventType.ALERT_TRIGGERED)
          .build();
      }).toThrow('Event actor is required');
    });

    it('should generate unique event IDs', () => {
      const event1 = new EventBuilder()
        .type(EventType.ALERT_TRIGGERED)
        .severity(EventSeverity.LOW)
        .actor(EventHelpers.systemActor('Test'))
        .subject({ type: 'test', id: '1' })
        .context({ tenantId: 'tenant-1' })
        .title('Test')
        .message('Test')
        .build();

      const event2 = new EventBuilder()
        .type(EventType.ALERT_TRIGGERED)
        .severity(EventSeverity.LOW)
        .actor(EventHelpers.systemActor('Test'))
        .subject({ type: 'test', id: '2' })
        .context({ tenantId: 'tenant-1' })
        .title('Test')
        .message('Test')
        .build();

      expect(event1.id).not.toBe(event2.id);
    });
  });

  describe('EventHelpers', () => {
    it('should create system actor', () => {
      const actor = EventHelpers.systemActor('Monitoring Service');
      expect(actor.type).toBe('system');
      expect(actor.name).toBe('Monitoring Service');
      expect(actor.id).toBe('system');
    });

    it('should create user actor', () => {
      const actor = EventHelpers.userActor('user-123', 'Alice', 'alice@example.com');
      expect(actor.type).toBe('user');
      expect(actor.name).toBe('Alice');
      expect(actor.id).toBe('user-123');
      expect(actor.email).toBe('alice@example.com');
    });

    it('should create copilot actor', () => {
      const actor = EventHelpers.copilotActor('copilot-1', 'Investigation Assistant');
      expect(actor.type).toBe('copilot');
      expect(actor.name).toBe('Investigation Assistant');
    });

    it('should map alert severity to event severity', () => {
      expect(EventHelpers.alertSeverityToEventSeverity('critical')).toBe(EventSeverity.CRITICAL);
      expect(EventHelpers.alertSeverityToEventSeverity('high')).toBe(EventSeverity.HIGH);
      expect(EventHelpers.alertSeverityToEventSeverity('warning')).toBe(EventSeverity.MEDIUM);
      expect(EventHelpers.alertSeverityToEventSeverity('info')).toBe(EventSeverity.INFO);
      expect(EventHelpers.alertSeverityToEventSeverity('unknown')).toBe(EventSeverity.MEDIUM);
    });
  });
});

describe('TemplateRegistry', () => {
  let registry: TemplateRegistry;

  beforeEach(() => {
    registry = new TemplateRegistry();
  });

  it('should have default templates registered', () => {
    const templates = registry.listTemplates();
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.some(t => t.eventType === EventType.ALERT_TRIGGERED)).toBe(true);
    expect(templates.some(t => t.eventType === EventType.SLO_VIOLATION)).toBe(true);
    expect(templates.some(t => t.eventType === EventType.PIPELINE_FAILED)).toBe(true);
  });

  it('should render event title', () => {
    const event = createTestEvent(EventType.ALERT_TRIGGERED);
    const title = registry.render(event, 'title');
    expect(title).toContain('Test Alert');
  });

  it('should render full message', () => {
    const event = createTestEvent(EventType.ALERT_TRIGGERED);
    const message = registry.render(event, 'full');
    expect(message).toContain('Test Alert');
    expect(message).toContain('Test message');
  });

  it('should render short message', () => {
    const event = createTestEvent(EventType.ALERT_TRIGGERED);
    const short = registry.render(event, 'short');
    expect(short.length).toBeLessThan(200);
  });

  it('should get call to action', () => {
    const event = createTestEvent(EventType.ALERT_TRIGGERED);
    const cta = registry.getCallToAction(event);
    expect(cta).toBeDefined();
  });

  it('should handle unknown event types gracefully', () => {
    const event = createTestEvent('unknown.event.type' as EventType);
    const message = registry.render(event, 'full');
    expect(message).toContain(event.title);
    expect(message).toContain(event.message);
  });
});

describe('PreferencesManager', () => {
  let manager: PreferencesManager;
  let storage: InMemoryPreferencesStorage;

  beforeEach(() => {
    storage = new InMemoryPreferencesStorage();
    manager = new PreferencesManager(storage);
  });

  it('should return default preferences for new user', async () => {
    const prefs = await manager.getEffectivePreferences('new-user');
    expect(prefs).toBeDefined();
    expect(prefs.channels.email?.enabled).toBe(true);
    expect(prefs.channels.chat?.enabled).toBe(true);
  });

  it('should enable/disable channels', async () => {
    await manager.setChannelEnabled('user-1', 'email', false);
    const prefs = await manager.getEffectivePreferences('user-1');
    expect(prefs.channels.email?.enabled).toBe(false);
  });

  it('should set minimum severity for channel', async () => {
    await manager.setChannelMinSeverity('user-1', 'email', EventSeverity.HIGH);
    const prefs = await manager.getEffectivePreferences('user-1');
    expect(prefs.channels.email?.minSeverity).toBe(EventSeverity.HIGH);
  });

  it('should configure quiet hours', async () => {
    await manager.setQuietHours('user-1', true, '22:00', '08:00', 'America/New_York');
    const prefs = await manager.getEffectivePreferences('user-1');
    expect(prefs.quietHours?.enabled).toBe(true);
    expect(prefs.quietHours?.start).toBe('22:00');
    expect(prefs.quietHours?.end).toBe('08:00');
    expect(prefs.quietHours?.timezone).toBe('America/New_York');
  });

  it('should exclude event types', async () => {
    await manager.excludeEventType('user-1', EventType.PIPELINE_STARTED);
    const prefs = await manager.getEffectivePreferences('user-1');
    expect(prefs.eventTypeFilters?.exclude).toContain(EventType.PIPELINE_STARTED);
  });

  it('should include event types after exclusion', async () => {
    await manager.excludeEventType('user-1', EventType.PIPELINE_STARTED);
    await manager.includeEventType('user-1', EventType.PIPELINE_STARTED);
    const prefs = await manager.getEffectivePreferences('user-1');
    expect(prefs.eventTypeFilters?.exclude || []).not.toContain(EventType.PIPELINE_STARTED);
  });

  it('should set severity threshold per event type', async () => {
    await manager.setEventTypeSeverityThreshold('user-1', EventType.ALERT_TRIGGERED, EventSeverity.CRITICAL);
    const prefs = await manager.getEffectivePreferences('user-1');
    expect(prefs.severityThresholds?.[EventType.ALERT_TRIGGERED]).toBe(EventSeverity.CRITICAL);
  });

  it('should reset preferences to defaults', async () => {
    await manager.setChannelEnabled('user-1', 'email', false);
    await manager.resetUserPreferences('user-1');
    const prefs = await manager.getEffectivePreferences('user-1');
    expect(prefs.channels.email?.enabled).toBe(true);
  });

  it('should provide default role preferences', () => {
    const roleDefaults = PreferencesManager.getDefaultRolePreferences();
    expect(roleDefaults.admin).toBeDefined();
    expect(roleDefaults.security).toBeDefined();
    expect(roleDefaults.devops).toBeDefined();
    expect(roleDefaults.investigator).toBeDefined();
    expect(roleDefaults.viewer).toBeDefined();
  });
});

describe('NotificationHub', () => {
  let hub: NotificationHub;

  beforeEach(async () => {
    hub = new NotificationHub({
      receivers: {
        email: {
          enabled: true,
          config: {
            from: { name: 'Test', email: 'test@example.com' },
          },
        },
      },
      routing: {
        rules: [],
        defaultChannels: ['email'],
      },
    });
    await hub.initialize();
  });

  afterEach(async () => {
    await hub.shutdown();
  });

  it('should initialize successfully', async () => {
    const health = await hub.healthCheck();
    expect(health.email).toBe(true);
  });

  it('should process notification and return job', async () => {
    const event = createTestEvent(EventType.ALERT_TRIGGERED);
    const job = await hub.notify(event);

    expect(job).toBeDefined();
    expect(job.id).toBeDefined();
    expect(job.event).toBe(event);
    expect(['completed', 'failed']).toContain(job.status);
  });

  it('should track metrics', async () => {
    const event = createTestEvent(EventType.ALERT_TRIGGERED);
    await hub.notify(event);

    const metrics = hub.getMetrics();
    expect(metrics.totalEvents).toBeGreaterThan(0);
  });

  it('should get job by ID', async () => {
    const event = createTestEvent(EventType.ALERT_TRIGGERED);
    const job = await hub.notify(event);

    const retrieved = hub.getJob(job.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(job.id);
  });

  it('should set and get user preferences', async () => {
    const prefs = {
      userId: 'test-user',
      channels: {
        email: { enabled: true, minSeverity: EventSeverity.HIGH },
      },
    };

    await hub.setUserPreferences('test-user', prefs as any);
    const retrieved = await hub.getUserPreferences('test-user');

    expect(retrieved).toBeDefined();
    expect(retrieved?.channels.email?.minSeverity).toBe(EventSeverity.HIGH);
  });
});

describe('EventAdapters', () => {
  let hub: NotificationHub;
  let registry: AdapterRegistry;

  beforeEach(async () => {
    hub = new NotificationHub({
      receivers: {
        email: {
          enabled: true,
          config: { from: { name: 'Test', email: 'test@example.com' } },
        },
      },
      routing: { rules: [], defaultChannels: ['email'] },
    });
    await hub.initialize();
    registry = new AdapterRegistry();
    await registry.initializeAll(hub);
  });

  afterEach(async () => {
    await registry.shutdownAll();
    await hub.shutdown();
  });

  describe('AlertingEventAdapter', () => {
    it('should handle alert triggered event', async () => {
      const adapter = registry.getAdapter<AlertingEventAdapter>('alerting')!;

      await expect(adapter.handleAlertTriggered({
        id: 'alert-123',
        name: 'High Error Rate',
        severity: 'critical',
        message: 'Error rate exceeded 5%',
        query: 'rate(errors[5m])',
        value: 7.2,
        threshold: 5.0,
        labels: { service: 'api' },
        tenantId: 'tenant-1',
        environment: 'production',
      })).resolves.not.toThrow();
    });

    it('should handle SLO violation', async () => {
      const adapter = registry.getAdapter<AlertingEventAdapter>('alerting')!;

      await expect(adapter.handleSLOViolation({
        id: 'slo-123',
        name: 'API Availability',
        errorBudget: 0.001,
        errorBudgetRemaining: 0.0002,
        burnRate: 5.2,
        tenantId: 'tenant-1',
        service: 'api',
      })).resolves.not.toThrow();
    });

    it('should handle golden path broken', async () => {
      const adapter = registry.getAdapter<AlertingEventAdapter>('alerting')!;

      await expect(adapter.handleGoldenPathBroken({
        name: 'main-deployment',
        stage: 'integration-tests',
        environment: 'staging',
        reason: 'Test timeout',
        tenantId: 'tenant-1',
      })).resolves.not.toThrow();
    });
  });

  describe('PipelineEventAdapter', () => {
    it('should handle pipeline failure', async () => {
      const adapter = registry.getAdapter<PipelineEventAdapter>('pipeline')!;

      await expect(adapter.handlePipelineFailure({
        id: 'pipeline-123',
        name: 'deploy-api',
        runId: 'run-456',
        failedStage: 'deploy',
        error: 'Deployment failed',
        tenantId: 'tenant-1',
      })).resolves.not.toThrow();
    });

    it('should handle workflow approval required', async () => {
      const adapter = registry.getAdapter<PipelineEventAdapter>('pipeline')!;

      await expect(adapter.handleWorkflowApprovalRequired({
        id: 'workflow-123',
        name: 'production-deploy',
        requester: { id: 'user-1', name: 'Alice' },
        approvers: [{ id: 'user-2', name: 'Bob' }],
        reason: 'Deploy v2.0',
        expiresAt: new Date(Date.now() + 86400000),
        tenantId: 'tenant-1',
      })).resolves.not.toThrow();
    });
  });

  describe('AuthorityEventAdapter', () => {
    it('should handle authority approval required', async () => {
      const adapter = registry.getAdapter<AuthorityEventAdapter>('authority')!;

      await expect(adapter.handleAuthorityApprovalRequired({
        id: 'auth-123',
        operation: 'delete-production-data',
        requester: { id: 'user-1', name: 'Alice' },
        requiredApprovers: 2,
        approvers: [
          { id: 'user-2', name: 'Bob', role: 'manager' },
          { id: 'user-3', name: 'Charlie', role: 'director' },
        ],
        reason: 'Data cleanup',
        expiresAt: new Date(Date.now() + 14400000),
        tenantId: 'tenant-1',
      })).resolves.not.toThrow();
    });

    it('should handle policy violation', async () => {
      const adapter = registry.getAdapter<AuthorityEventAdapter>('authority')!;

      await expect(adapter.handlePolicyViolation({
        id: 'violation-123',
        policy: 'clearance-level-3',
        user: { id: 'user-1', name: 'Alice' },
        operation: 'access-classified',
        reason: 'Insufficient clearance',
        tenantId: 'tenant-1',
      })).resolves.not.toThrow();
    });
  });

  describe('CopilotEventAdapter', () => {
    it('should handle copilot escalation', async () => {
      const adapter = registry.getAdapter<CopilotEventAdapter>('copilot')!;

      await expect(adapter.handleCopilotEscalation({
        runId: 'run-123',
        copilotName: 'Investigation Assistant',
        reason: 'Ambiguous data',
        context: { investigationId: 'inv-456' },
        tenantId: 'tenant-1',
      })).resolves.not.toThrow();
    });

    it('should handle anomaly detected', async () => {
      const adapter = registry.getAdapter<CopilotEventAdapter>('copilot')!;

      await expect(adapter.handleCopilotAnomalyDetected({
        runId: 'run-123',
        copilotName: 'Anomaly Detector',
        anomalyType: 'unusual-pattern',
        score: 0.92,
        description: 'High-confidence anomaly',
        tenantId: 'tenant-1',
      })).resolves.not.toThrow();
    });
  });

  describe('AdapterRegistry', () => {
    it('should return health status for all adapters', async () => {
      const health = await registry.healthCheckAll();
      expect(health.alerting).toBe(true);
      expect(health.pipeline).toBe(true);
      expect(health.copilot).toBe(true);
      expect(health.authority).toBe(true);
      expect(health.investigation).toBe(true);
    });
  });
});

// Helper function to create test events
function createTestEvent(type: EventType): CanonicalEvent {
  return new EventBuilder()
    .type(type)
    .severity(EventSeverity.HIGH)
    .actor(EventHelpers.systemActor('Test System'))
    .subject({
      type: 'test',
      id: 'test-123',
      name: 'Test Alert',
      url: 'https://example.com/test/123',
    })
    .context({
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environment: 'production',
    })
    .title('Test Alert')
    .message('Test message')
    .payload({ testKey: 'testValue' })
    .build();
}
