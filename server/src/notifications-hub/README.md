# Notifications & Integrations Hub

A comprehensive notification system for Summit that provides unified event handling, multi-channel delivery, and intelligent routing with noise control.

## Overview

The Notifications Hub is a central orchestration system that:

1. **Defines a canonical event model** - All events in Summit follow a standardized structure
2. **Supports multiple receivers** - Email, Chat (Slack/Teams/Discord/Mattermost), Webhooks
3. **Integrates with existing systems** - Alerting/SLO, Pipeline Orchestrator, Copilot, Two-Person Control
4. **Manages user preferences** - Per-user and per-role notification settings for noise control
5. **Tracks metrics** - Delivery status, latency, and channel health

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Event Sources                            │
├─────────────────────────────────────────────────────────────────┤
│  Alerting  │  Pipeline  │  Copilot  │  Authority  │  Other...   │
└──────┬─────┴─────┬──────┴─────┬─────┴──────┬──────┴────────────┘
       │           │            │            │
       └───────────┴────────────┴────────────┘
                      │
              ┌───────▼────────┐
              │  Event Adapters │
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │ Canonical Event │
              └───────┬────────┘
                      │
          ┌───────────▼───────────┐
          │  Notification Hub      │
          │  - Routing Rules       │
          │  - Preferences Filter  │
          │  - Receiver Dispatch   │
          └───┬────────┬─────┬────┘
              │        │     │
       ┌──────▼──┐ ┌──▼───┐ ┌▼────────┐
       │  Email  │ │ Chat │ │ Webhook │
       │Receiver │ │Recv. │ │Receiver │
       └─────────┘ └──────┘ └─────────┘
```

## Key Concepts

### Canonical Event Model

All events in Summit follow this structure:

```typescript
interface CanonicalEvent {
  id: string;
  type: EventType;
  severity: EventSeverity;

  actor: EventActor;      // Who triggered the event
  subject: EventSubject;  // What the event is about
  context: EventContext;  // Tenant, project, environment

  title: string;
  message: string;
  payload: Record<string, unknown>;

  timestamp: Date;
  status: EventStatus;
}
```

### Event Types

Over 30 predefined event types across categories:
- **Alerting & SLO**: `ALERT_TRIGGERED`, `SLO_VIOLATION`, `GOLDEN_PATH_BROKEN`
- **Pipeline**: `PIPELINE_FAILED`, `WORKFLOW_APPROVAL_REQUIRED`
- **Authority**: `AUTHORITY_APPROVAL_REQUIRED`, `AUTHORITY_DISSENT`, `POLICY_VIOLATION`
- **Copilot**: `COPILOT_ESCALATION`, `COPILOT_ANOMALY_DETECTED`
- **Investigation**: `EVIDENCE_ADDED`, `ENTITY_RISK_CHANGED`
- **System**: `SYSTEM_HEALTH_DEGRADED`, `BUDGET_THRESHOLD_EXCEEDED`

### Receivers

Three built-in receiver types:

1. **EmailReceiver** - SMTP/email service integration with HTML templating
2. **ChatReceiver** - Unified adapter for Slack, Teams, Discord, Mattermost
3. **WebhookReceiver** - HTTP webhooks with authentication and signature verification

Each receiver supports:
- Retry with exponential backoff
- Health checks
- Delivery metrics
- Custom configuration

### Preferences & Noise Control

Per-user and per-role preferences control notification behavior:

```typescript
interface NotificationPreferences {
  channels: {
    email?: { enabled: boolean; minSeverity?: EventSeverity };
    chat?: { enabled: boolean; minSeverity?: EventSeverity };
    webhook?: { enabled: boolean };
  };
  quietHours?: {
    enabled: boolean;
    start: string;  // "22:00"
    end: string;    // "08:00"
    timezone: string;
  };
  severityThresholds?: Record<EventType, EventSeverity>;
  eventTypeFilters?: {
    include?: EventType[];
    exclude?: EventType[];
  };
}
```

## Usage

### Basic Setup

```typescript
import { createNotificationHub, createAdapterRegistry } from './notifications-hub';

// Create and initialize hub
const hub = await createNotificationHub({
  email: {
    enabled: true,
    from: { name: 'Summit', email: 'notifications@summit.example.com' },
    smtp: {
      host: 'smtp.example.com',
      port: 587,
      secure: true,
      auth: { user: 'smtp-user', pass: 'smtp-pass' },
    },
  },
  chat: {
    enabled: true,
    platform: 'slack',
    credentials: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL
    },
  },
  webhook: {
    enabled: true,
    signatureSecret: process.env.WEBHOOK_SECRET,
  },
  routing: {
    defaultChannels: ['email', 'chat'],
  },
});

// Initialize adapters
const adapters = await createAdapterRegistry(hub);
```

### Using Event Adapters

#### Alerting Events

```typescript
const alertingAdapter = adapters.getAdapter('alerting');

await alertingAdapter.handleAlertTriggered({
  id: 'alert-123',
  name: 'High Error Rate',
  severity: 'critical',
  message: 'Error rate exceeded 5%',
  query: 'rate(errors[5m])',
  value: 7.2,
  threshold: 5.0,
  labels: { service: 'api', environment: 'production' },
  tenantId: 'tenant-1',
  environment: 'production',
  dashboardUrl: 'https://summit.example.com/alerts/123',
});

await alertingAdapter.handleSLOViolation({
  id: 'slo-456',
  name: 'API Availability SLO',
  errorBudget: 0.001,
  errorBudgetRemaining: 0.0002,
  burnRate: 5.2,
  tenantId: 'tenant-1',
  service: 'api',
  dashboardUrl: 'https://summit.example.com/slo/456',
});

await alertingAdapter.handleGoldenPathBroken({
  name: 'main-deployment',
  stage: 'integration-tests',
  environment: 'staging',
  reason: 'Test suite timeout after 30 minutes',
  tenantId: 'tenant-1',
  runUrl: 'https://summit.example.com/pipelines/run-789',
});
```

#### Pipeline Events

```typescript
const pipelineAdapter = adapters.getAdapter('pipeline');

await pipelineAdapter.handlePipelineFailure({
  id: 'pipeline-123',
  name: 'api-deployment',
  runId: 'run-456',
  failedStage: 'deploy-to-production',
  error: 'Deployment health check failed',
  userId: 'user-789',
  userName: 'Alice Developer',
  tenantId: 'tenant-1',
  pipelineUrl: 'https://summit.example.com/pipelines/123/run/456',
});

await pipelineAdapter.handleWorkflowApprovalRequired({
  id: 'workflow-789',
  name: 'production-deployment',
  requester: {
    id: 'user-123',
    name: 'Bob DevOps',
    email: 'bob@example.com'
  },
  approvers: [
    { id: 'user-456', name: 'Alice Lead' },
    { id: 'user-789', name: 'Charlie Manager' },
  ],
  reason: 'Deploy v2.5.0 to production',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  tenantId: 'tenant-1',
  approvalUrl: 'https://summit.example.com/approvals/789',
});
```

#### Authority Events (Two-Person Control)

```typescript
const authorityAdapter = adapters.getAdapter('authority');

await authorityAdapter.handleAuthorityApprovalRequired({
  id: 'auth-123',
  operation: 'delete-production-data',
  requester: {
    id: 'user-123',
    name: 'Alice Admin',
    email: 'alice@example.com'
  },
  requiredApprovers: 2,
  approvers: [
    { id: 'user-456', name: 'Bob Manager', role: 'manager' },
    { id: 'user-789', name: 'Charlie Director', role: 'director' },
    { id: 'user-101', name: 'Diana CISO', role: 'security' },
  ],
  reason: 'Remove test data from production database',
  expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
  tenantId: 'tenant-1',
  approvalUrl: 'https://summit.example.com/authority/123',
});

await authorityAdapter.handleAuthorityDissent({
  id: 'dissent-456',
  operation: 'emergency-deploy',
  dissenter: { id: 'user-789', name: 'Charlie Security' },
  reason: 'Deployment bypassed security review process',
  originalApproval: {
    id: 'auth-789',
    operation: 'emergency-deploy'
  },
  tenantId: 'tenant-1',
  reviewUrl: 'https://summit.example.com/dissent/456',
});

await authorityAdapter.handlePolicyViolation({
  id: 'violation-789',
  policy: 'clearance-level-3-required',
  user: {
    id: 'user-123',
    name: 'Alice User',
    email: 'alice@example.com'
  },
  operation: 'access-classified-data',
  reason: 'User clearance level 2, operation requires level 3',
  tenantId: 'tenant-1',
  reviewUrl: 'https://summit.example.com/violations/789',
});
```

#### Copilot Events

```typescript
const copilotAdapter = adapters.getAdapter('copilot');

await copilotAdapter.handleCopilotEscalation({
  runId: 'run-123',
  copilotName: 'Investigation Assistant',
  reason: 'Ambiguous data pattern requires human judgment',
  context: {
    investigationId: 'inv-456',
    conflictingEvidence: ['evidence-1', 'evidence-2'],
  },
  tenantId: 'tenant-1',
  runUrl: 'https://summit.example.com/copilot/run-123',
});

await copilotAdapter.handleCopilotAnomalyDetected({
  runId: 'run-456',
  copilotName: 'Anomaly Detector',
  anomalyType: 'unusual-transaction-pattern',
  score: 0.92,
  description: 'Detected transaction pattern deviates from baseline by 3 standard deviations',
  tenantId: 'tenant-1',
  investigationUrl: 'https://summit.example.com/investigations/anomaly-456',
});
```

#### Investigation Events

```typescript
const investigationAdapter = adapters.getAdapter('investigation');

await investigationAdapter.handleEvidenceAdded({
  investigationId: 'inv-123',
  investigationName: 'Fraud Case #2024-001',
  evidenceId: 'evidence-456',
  evidenceType: 'transaction-record',
  addedBy: { id: 'user-123', name: 'Alice Investigator' },
  summary: 'Suspicious wire transfer to offshore account',
  tenantId: 'tenant-1',
  investigationUrl: 'https://summit.example.com/investigations/123',
});
```

### Creating Custom Events

```typescript
import {
  EventBuilder,
  EventType,
  EventSeverity,
  EventHelpers
} from './notifications-hub';

const event = new EventBuilder()
  .type(EventType.ALERT_TRIGGERED)
  .severity(EventSeverity.CRITICAL)
  .actor(EventHelpers.systemActor('Custom Monitoring'))
  .subject({
    type: 'custom_alert',
    id: 'alert-custom-123',
    name: 'Database Connection Pool Exhausted',
    url: 'https://summit.example.com/alerts/custom-123',
  })
  .context({
    tenantId: 'tenant-1',
    projectId: 'project-api',
    environment: 'production',
    tags: {
      service: 'database',
      pool: 'primary'
    },
  })
  .title('Critical: Database Connection Pool Exhausted')
  .message('All 100 connections in the primary pool are in use. New requests are being queued.')
  .payload({
    poolSize: 100,
    activeConnections: 100,
    queuedRequests: 45,
    avgWaitTime: 2.5,
  })
  .source('custom-monitoring')
  .correlationId('incident-123')
  .addLink('dashboard', 'https://grafana.example.com/d/db', 'View Dashboard')
  .addLink('runbook', 'https://docs.example.com/runbook/db-pool', 'Runbook')
  .build();

await hub.notify(event);
```

### Managing User Preferences

```typescript
import { PreferencesManager, EventSeverity, EventType } from './notifications-hub';

const prefsManager = new PreferencesManager();

// Enable email notifications
await prefsManager.setChannelEnabled('user-123', 'email', true);

// Set minimum severity for email
await prefsManager.setChannelMinSeverity(
  'user-123',
  'email',
  EventSeverity.HIGH
);

// Configure quiet hours
await prefsManager.setQuietHours(
  'user-123',
  true,
  '22:00',
  '08:00',
  'America/New_York'
);

// Exclude specific event types
await prefsManager.excludeEventType(
  'user-123',
  EventType.ANALYTICS_COMPLETE
);

// Set severity threshold for specific event type
await prefsManager.setEventTypeSeverityThreshold(
  'user-123',
  EventType.PIPELINE_FAILED,
  EventSeverity.HIGH
);

// Get effective preferences (merges user + role preferences)
const prefs = await prefsManager.getEffectivePreferences('user-123');
```

### Setting Role-Based Preferences

```typescript
// Configure preferences for DevOps role
await prefsManager.setRolePreferences(
  'devops',
  'DevOps Team',
  {
    channels: {
      email: {
        enabled: true,
        minSeverity: EventSeverity.HIGH,
        eventTypes: [
          EventType.ALERT_TRIGGERED,
          EventType.SLO_VIOLATION,
          EventType.GOLDEN_PATH_BROKEN,
          EventType.PIPELINE_FAILED,
        ],
      },
      chat: {
        enabled: true,
        minSeverity: EventSeverity.HIGH,
      },
    },
    eventTypeFilters: {
      include: [
        EventType.ALERT_TRIGGERED,
        EventType.SLO_VIOLATION,
        EventType.GOLDEN_PATH_BROKEN,
        EventType.PIPELINE_STARTED,
        EventType.PIPELINE_COMPLETED,
        EventType.PIPELINE_FAILED,
        EventType.DEPLOYMENT_COMPLETED,
        EventType.DEPLOYMENT_FAILED,
        EventType.SYSTEM_HEALTH_DEGRADED,
      ],
    },
  },
  75  // Priority (higher = more important)
);
```

## Integrating a New Destination

To add a new chat platform or notification channel:

1. **Implement the IChatAdapter interface** (for chat platforms):

```typescript
export class CustomChatAdapter implements IChatAdapter {
  readonly platform: ChatPlatform = 'custom';

  async initialize(credentials: Record<string, unknown>): Promise<void> {
    // Initialize API client
  }

  async sendMessage(message: ChatMessage): Promise<string> {
    // Send message to your platform
    return 'message-id';
  }

  async validateChannel(channel: string): Promise<boolean> {
    // Validate channel/recipient
    return true;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async shutdown(): Promise<void> {
    // Cleanup
  }
}
```

2. **Register the adapter in ChatReceiver**:

```typescript
private createAdapter(platform: ChatPlatform): IChatAdapter {
  switch (platform) {
    // ... existing platforms
    case 'custom':
      return new CustomChatAdapter();
  }
}
```

3. **Configure and use**:

```typescript
const hub = await createNotificationHub({
  chat: {
    enabled: true,
    platform: 'custom',
    credentials: { apiKey: '...' },
  },
});
```

## Webhook Integration Example

For receiving systems to integrate via webhooks:

```typescript
// Server-side webhook handler
import { WebhookValidator } from './notifications-hub';

app.post('/webhooks/summit-notifications', async (req, res) => {
  const payload = req.body;
  const signature = req.headers['x-summit-signature'];
  const secret = process.env.WEBHOOK_SECRET;

  // Validate webhook
  const validation = WebhookValidator.validate(payload, signature, secret);
  if (!validation.valid) {
    return res.status(401).json({ error: validation.error });
  }

  // Process event
  const event = payload.event;
  console.log('Received event:', event.type, event.severity);

  // Handle based on event type
  switch (event.type) {
    case 'alert.triggered':
      await handleAlert(event);
      break;
    case 'pipeline.failed':
      await handlePipelineFailure(event);
      break;
    // ... other event types
  }

  res.status(200).json({ received: true });
});
```

## Metrics and Health

```typescript
// Get notification metrics
const metrics = hub.getMetrics();
console.log('Total notifications:', metrics.totalNotifications);
console.log('Delivery rate:',
  (metrics.totalDelivered / metrics.totalNotifications * 100).toFixed(2) + '%'
);
console.log('Channel stats:', metrics.byChannel);

// Health check
const health = await hub.healthCheck();
console.log('Receivers health:', health);  // { email: true, chat: true, webhook: true }

const adapterHealth = await adapters.healthCheckAll();
console.log('Adapters health:', adapterHealth);  // { alerting: true, pipeline: true, ... }
```

## Testing

Mock implementations are provided for all external integrations:

```typescript
// Unit test example
import { EventBuilder, EventType, EventSeverity, EventHelpers } from './notifications-hub';

describe('Notification Hub', () => {
  it('should deliver high-severity alerts', async () => {
    const hub = await createNotificationHub({
      email: { enabled: true, from: { name: 'Test', email: 'test@example.com' } },
    });

    const event = new EventBuilder()
      .type(EventType.ALERT_TRIGGERED)
      .severity(EventSeverity.HIGH)
      .actor(EventHelpers.systemActor('Test'))
      .subject({ type: 'test', id: '123', name: 'Test Alert' })
      .context({ tenantId: 'test-tenant' })
      .title('Test Alert')
      .message('Test message')
      .build();

    const job = await hub.notify(event);
    expect(job.status).toBe('completed');
    expect(job.results.some(r => r.success)).toBe(true);
  });
});
```

## Performance Considerations

- **Batching**: Configure batching windows for non-critical notifications
- **Rate Limiting**: Built into receiver configurations
- **Async Processing**: All notifications are processed asynchronously
- **Retry Logic**: Exponential backoff for failed deliveries
- **Health Checks**: Regular monitoring of receiver health

## Security

- **Webhook Signatures**: HMAC-SHA256 signature verification
- **Authentication**: Support for multiple auth methods (Basic, Bearer, API Key)
- **Tenant Isolation**: All events include tenant context
- **Audit Trail**: All notifications are logged with delivery status

## Future Enhancements

- Database-backed preference storage
- Real-time WebSocket notifications to UI
- Advanced batching and digest emails
- Custom routing DSL
- Notification scheduling
- A/B testing for notification content
- Machine learning for optimal delivery timing

## Support

For issues or questions:
- Documentation: https://docs.summit.example.com/notifications
- GitHub Issues: https://github.com/summit/notifications-hub/issues
- Slack: #notifications-hub
