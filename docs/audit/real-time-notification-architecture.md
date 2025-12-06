# Real-Time Audit Notification Architecture

> **Author**: Claude Code
> **Date**: 2025-11-25
> **Status**: Design Document
> **Related**: `audit-system-design.md`, `AUDIT_AND_COMPLIANCE.md`

## Overview

This document describes the real-time notification system that extends the existing audit infrastructure to deliver critical security events and compliance alerts to users through multiple channels.

## Goals

1. **Real-Time Delivery**: Instant notification of critical audit events
2. **Multi-Channel Support**: WebSocket, Email, Slack, and extensible architecture
3. **User Preferences**: Granular control over which events trigger notifications
4. **Role-Based Routing**: Automatic notification routing based on user roles
5. **Smart Throttling**: Prevent notification fatigue through intelligent batching
6. **Audit Trail**: All notifications are logged for compliance

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Audit Event Stream                        │
│  (event_store, audit_events, compliance_alerts)             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               Notification Router Service                    │
│  • Event classification & severity scoring                   │
│  • User preference matching                                  │
│  • Rate limiting & throttling                                │
│  • Channel selection                                         │
└────────┬────────────┬─────────────┬─────────────┬───────────┘
         │            │             │             │
         ▼            ▼             ▼             ▼
┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│  WebSocket   │ │  Email   │ │  Slack   │ │  Webhook     │
│  Delivery    │ │  Service │ │  Service │ │  Service     │
└──────┬───────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘
       │              │            │              │
       ▼              ▼            ▼              ▼
┌──────────────────────────────────────────────────────────┐
│              Connected Clients & Services                 │
└──────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Notification Router Service

**Location**: `services/notification-router/`

**Responsibilities**:
- Listen to audit event stream (PostgreSQL LISTEN/NOTIFY or Kafka)
- Evaluate event severity and classification
- Match events against user notification preferences
- Apply throttling and batching rules
- Route to appropriate delivery channels
- Log all notification delivery attempts

**Key Features**:
- Event-driven architecture using PostgreSQL NOTIFY or Kafka
- In-memory preference cache (Redis)
- Circuit breaker for external services
- Retry logic with exponential backoff
- Dead letter queue for failed deliveries

#### 2. Notification Preference Service

**Location**: `services/notification-preferences/`

**Responsibilities**:
- Store user notification preferences
- Provide preference lookup API
- Handle preference inheritance (role-based defaults)
- Support quiet hours and do-not-disturb
- Manage notification channels per user

#### 3. Channel Delivery Services

**WebSocket Service**
- Real-time push to connected web clients
- Persistent connection management
- Reconnection handling
- Message queuing for offline clients

**Email Service**
- SMTP integration (AWS SES, SendGrid, etc.)
- HTML template rendering
- Digest emails for batched notifications
- Bounce and complaint handling

**Slack Service**
- Slack Incoming Webhooks or Bot API
- Channel routing based on severity
- Interactive message buttons (acknowledge, investigate)
- Thread grouping for related events

**Webhook Service**
- HTTP POST to user-configured endpoints
- Signature verification (HMAC)
- Retry with exponential backoff
- Rate limiting per webhook

## Database Schema

### notification_preferences

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,

  -- Event filters
  event_types TEXT[], -- NULL = all events
  severity_threshold TEXT NOT NULL DEFAULT 'warn', -- 'info', 'warn', 'error', 'critical'
  resource_types TEXT[], -- Filter by resource type
  tags TEXT[], -- Filter by event tags

  -- Channel configuration
  channels JSONB NOT NULL DEFAULT '{"websocket": true, "email": false, "slack": false}',

  -- Email settings
  email_address VARCHAR(255),
  email_digest_frequency TEXT, -- 'immediate', 'hourly', 'daily', 'never'

  -- Slack settings
  slack_webhook_url TEXT,
  slack_channel VARCHAR(100),

  -- Webhook settings
  webhook_url TEXT,
  webhook_secret TEXT, -- For HMAC signature

  -- Throttling
  max_notifications_per_hour INTEGER DEFAULT 100,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_timezone VARCHAR(50) DEFAULT 'UTC',

  -- Status
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, tenant_id)
);

CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_tenant ON notification_preferences(tenant_id);
```

### notification_delivery_log

```sql
CREATE TABLE notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to audit event
  audit_event_id UUID NOT NULL,
  correlation_id VARCHAR(255), -- For grouping related notifications

  -- Recipient
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,

  -- Delivery details
  channel TEXT NOT NULL, -- 'websocket', 'email', 'slack', 'webhook'
  destination TEXT, -- Email address, Slack channel, webhook URL

  -- Notification content
  notification_title VARCHAR(255) NOT NULL,
  notification_body TEXT NOT NULL,
  notification_data JSONB,

  -- Status tracking
  status TEXT NOT NULL, -- 'pending', 'sent', 'delivered', 'failed', 'throttled'
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,

  FOREIGN KEY (audit_event_id) REFERENCES audit_events(id)
);

CREATE INDEX idx_notification_delivery_user ON notification_delivery_log(user_id);
CREATE INDEX idx_notification_delivery_status ON notification_delivery_log(status);
CREATE INDEX idx_notification_delivery_audit_event ON notification_delivery_log(audit_event_id);
CREATE INDEX idx_notification_delivery_created_at ON notification_delivery_log(created_at DESC);
```

### notification_templates

```sql
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template identification
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'email', 'slack', 'websocket'
  tenant_id VARCHAR(255), -- NULL for system-wide templates

  -- Template content
  title_template TEXT NOT NULL, -- Handlebars template
  body_template TEXT NOT NULL, -- Handlebars template

  -- Email-specific
  subject_template TEXT,
  html_template TEXT,

  -- Slack-specific
  slack_blocks JSONB, -- Slack Block Kit JSON

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(event_type, channel, tenant_id)
);
```

## Event Severity Scoring

### Severity Calculation Algorithm

```typescript
function calculateNotificationSeverity(event: AuditEvent): NotificationSeverity {
  let score = 0;

  // Base severity from audit event
  const severityScores = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    critical: 4
  };
  score += severityScores[event.level] || 0;

  // Compliance impact
  if (event.compliance_frameworks?.length > 0) {
    score += 1; // Any compliance framework adds weight
  }

  // Security-sensitive event types
  const highRiskEvents = [
    'access_denied',
    'permission_revoked',
    'data_breach',
    'data_deletion',
    'security_alert',
    'anomaly_detected',
    'brute_force_detected',
    'suspicious_activity',
    'policy_violation'
  ];
  if (highRiskEvents.includes(event.event_type)) {
    score += 2;
  }

  // Failed operations
  if (event.outcome === 'failure') {
    score += 1;
  }

  // Legal hold or investigation context
  if (event.legal_hold) {
    score += 2;
  }

  // Convert score to severity
  if (score >= 6) return 'emergency';
  if (score >= 4) return 'critical';
  if (score >= 3) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}
```

### Notification Severity Levels

```typescript
type NotificationSeverity =
  | 'low'       // Informational, digest-only
  | 'medium'    // Important, throttled delivery
  | 'high'      // Urgent, immediate delivery
  | 'critical'  // Critical, all channels + escalation
  | 'emergency'; // Emergency, bypass quiet hours + SMS

// Routing rules
const severityRouting: Record<NotificationSeverity, ChannelStrategy> = {
  low: {
    channels: ['websocket'],
    throttle: '15min',
    batchable: true
  },
  medium: {
    channels: ['websocket', 'email'],
    throttle: '5min',
    batchable: true
  },
  high: {
    channels: ['websocket', 'email', 'slack'],
    throttle: '1min',
    batchable: false
  },
  critical: {
    channels: ['websocket', 'email', 'slack', 'webhook'],
    throttle: 'none',
    batchable: false,
    escalation: true
  },
  emergency: {
    channels: ['websocket', 'email', 'slack', 'webhook', 'sms'],
    throttle: 'none',
    batchable: false,
    bypassQuietHours: true,
    escalation: true,
    autoAcknowledgeRequired: true
  }
};
```

## Notification Flow

### 1. Event Ingestion

```typescript
// In AuditService.recordEvent()
const event = await this.storage.insert(auditEvent);

// Emit event for notification processing
await this.notificationBus.publish('audit.event.created', {
  eventId: event.id,
  eventType: event.event_type,
  severity: event.level,
  tenantId: event.tenant_id,
  timestamp: event.timestamp
});
```

### 2. Notification Router Processing

```typescript
// In NotificationRouterService
this.notificationBus.subscribe('audit.event.created', async (message) => {
  const event = await this.auditService.getEvent(message.eventId);

  // Calculate notification severity
  const severity = this.calculateSeverity(event);

  // Skip low-severity events unless explicitly subscribed
  if (severity === 'low' && !this.hasExplicitSubscribers(event)) {
    return;
  }

  // Find matching notification preferences
  const recipients = await this.findRecipients(event, severity);

  // Route to channels
  for (const recipient of recipients) {
    await this.routeNotification({
      event,
      severity,
      recipient,
      channels: this.selectChannels(severity, recipient.preferences)
    });
  }
});
```

### 3. Channel Delivery

```typescript
// WebSocket delivery
async deliverViaWebSocket(notification: Notification) {
  const connections = this.websocketManager.getConnections(notification.userId);

  for (const conn of connections) {
    await conn.send({
      type: 'audit.notification',
      payload: notification
    });
  }

  await this.logDelivery(notification, 'websocket', 'sent');
}

// Email delivery
async deliverViaEmail(notification: Notification) {
  const template = await this.getTemplate(notification.eventType, 'email');
  const html = this.renderTemplate(template, notification);

  await this.emailService.send({
    to: notification.recipient.email,
    subject: notification.title,
    html: html
  });

  await this.logDelivery(notification, 'email', 'sent');
}

// Slack delivery
async deliverViaSlack(notification: Notification) {
  const template = await this.getTemplate(notification.eventType, 'slack');
  const blocks = this.renderSlackBlocks(template, notification);

  await this.slackClient.postMessage({
    channel: notification.recipient.slackChannel,
    blocks: blocks,
    text: notification.title // Fallback
  });

  await this.logDelivery(notification, 'slack', 'sent');
}
```

## Smart Throttling

### Throttling Strategies

1. **Rate Limiting**: Maximum N notifications per time window per user
2. **Event Deduplication**: Suppress duplicate events within time window
3. **Event Batching**: Combine similar events into digest notifications
4. **Quiet Hours**: Respect user-defined do-not-disturb periods
5. **Escalation**: Critical events bypass throttling

### Implementation

```typescript
interface ThrottlingConfig {
  maxPerMinute: number;
  maxPerHour: number;
  deduplicationWindow: number; // milliseconds
  batchingWindow: number; // milliseconds
  quietHoursEnabled: boolean;
}

class NotificationThrottler {
  private redis: Redis;

  async shouldDeliver(notification: Notification): Promise<boolean> {
    // Critical events always deliver
    if (notification.severity === 'critical' || notification.severity === 'emergency') {
      return true;
    }

    // Check quiet hours
    if (await this.isQuietHours(notification.userId)) {
      await this.queueForLater(notification);
      return false;
    }

    // Check rate limits
    const rateKey = `rate:${notification.userId}:${notification.channel}`;
    const count = await this.redis.incr(rateKey);
    if (count === 1) {
      await this.redis.expire(rateKey, 60); // 1 minute window
    }

    if (count > notification.maxPerMinute) {
      await this.logThrottled(notification);
      return false;
    }

    // Check deduplication
    const dedupKey = `dedup:${notification.userId}:${notification.eventType}`;
    const isDuplicate = await this.redis.exists(dedupKey);
    if (isDuplicate) {
      return false;
    }
    await this.redis.setex(dedupKey, 300, '1'); // 5 minute dedup window

    return true;
  }
}
```

## GraphQL API

### Mutations

```graphql
extend type Mutation {
  """
  Update notification preferences for the current user
  """
  updateNotificationPreferences(
    input: NotificationPreferencesInput!
  ): NotificationPreferences! @auth

  """
  Mark notification as read
  """
  markNotificationRead(id: ID!): NotificationDelivery! @auth

  """
  Acknowledge critical notification
  """
  acknowledgeNotification(id: ID!, note: String): NotificationDelivery! @auth

  """
  Test notification delivery (admin only)
  """
  testNotification(
    userId: ID!
    channel: NotificationChannel!
    message: String!
  ): Boolean! @auth(requires: ADMIN)
}

input NotificationPreferencesInput {
  eventTypes: [String!]
  severityThreshold: AuditLevel!
  resourceTypes: [String!]
  tags: [String!]
  channels: NotificationChannelsInput!
  emailAddress: String
  emailDigestFrequency: DigestFrequency
  slackWebhookUrl: String
  slackChannel: String
  webhookUrl: String
  maxNotificationsPerHour: Int
  quietHoursStart: Time
  quietHoursEnd: Time
  quietHoursTimezone: String
  enabled: Boolean
}

input NotificationChannelsInput {
  websocket: Boolean!
  email: Boolean!
  slack: Boolean!
  webhook: Boolean!
}

enum DigestFrequency {
  IMMEDIATE
  HOURLY
  DAILY
  NEVER
}
```

### Queries

```graphql
extend type Query {
  """
  Get notification preferences for the current user
  """
  myNotificationPreferences: NotificationPreferences! @auth

  """
  Get notification delivery history
  """
  notificationHistory(
    first: Int
    after: String
    filter: NotificationHistoryFilter
  ): NotificationHistoryConnection! @auth

  """
  Get unread notification count
  """
  unreadNotificationCount: Int! @auth
}

type NotificationPreferences {
  id: ID!
  userId: ID!
  eventTypes: [String!]
  severityThreshold: AuditLevel!
  channels: NotificationChannels!
  emailAddress: String
  emailDigestFrequency: DigestFrequency
  quietHoursStart: Time
  quietHoursEnd: Time
  enabled: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type NotificationChannels {
  websocket: Boolean!
  email: Boolean!
  slack: Boolean!
  webhook: Boolean!
}

type NotificationDelivery {
  id: ID!
  auditEvent: AuditEvent!
  title: String!
  body: String!
  channel: NotificationChannel!
  status: NotificationStatus!
  createdAt: DateTime!
  sentAt: DateTime
  readAt: DateTime
  acknowledgedAt: DateTime
}

enum NotificationChannel {
  WEBSOCKET
  EMAIL
  SLACK
  WEBHOOK
  SMS
}

enum NotificationStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
  THROTTLED
  READ
  ACKNOWLEDGED
}
```

### Subscriptions

```graphql
extend type Subscription {
  """
  Real-time notification stream for the current user
  """
  notificationReceived: NotificationDelivery! @auth

  """
  Real-time notification count updates
  """
  unreadCountUpdated: Int! @auth
}
```

## UI Components

### 1. Notification Bell (Header)

```tsx
// web/src/components/NotificationBell.tsx
import { Badge, IconButton, Popover } from '@mui/material';
import { NotificationsOutlined } from '@mui/icons-material';

export function NotificationBell() {
  const { data } = useQuery(UNREAD_NOTIFICATION_COUNT);
  const { data: notifications } = useNotificationSubscription();

  return (
    <IconButton>
      <Badge badgeContent={data?.unreadNotificationCount} color="error">
        <NotificationsOutlined />
      </Badge>
    </IconButton>
  );
}
```

### 2. Notification Popover

```tsx
// web/src/components/NotificationPopover.tsx
export function NotificationPopover() {
  const { data } = useQuery(NOTIFICATION_HISTORY, {
    variables: { first: 20 }
  });

  return (
    <List>
      {data?.notificationHistory?.edges.map(({ node }) => (
        <NotificationItem
          key={node.id}
          notification={node}
          onRead={handleMarkRead}
        />
      ))}
    </List>
  );
}
```

### 3. Notification Preferences Page

```tsx
// web/src/pages/settings/NotificationPreferences.tsx
export function NotificationPreferencesPage() {
  const { data } = useQuery(MY_NOTIFICATION_PREFERENCES);
  const [update] = useMutation(UPDATE_NOTIFICATION_PREFERENCES);

  return (
    <Card>
      <CardContent>
        <FormGroup>
          <FormControlLabel
            control={<Switch />}
            label="WebSocket Notifications"
          />
          <FormControlLabel
            control={<Switch />}
            label="Email Notifications"
          />
          <FormControlLabel
            control={<Switch />}
            label="Slack Notifications"
          />
        </FormGroup>

        <TextField
          select
          label="Severity Threshold"
          value={preferences.severityThreshold}
        >
          <MenuItem value="info">Info and above</MenuItem>
          <MenuItem value="warn">Warning and above</MenuItem>
          <MenuItem value="error">Error and above</MenuItem>
          <MenuItem value="critical">Critical only</MenuItem>
        </TextField>

        <TextField
          label="Email Address"
          value={preferences.emailAddress}
        />

        <TextField
          label="Slack Webhook URL"
          value={preferences.slackWebhookUrl}
        />

        <Button onClick={handleSave}>Save Preferences</Button>
      </CardContent>
    </Card>
  );
}
```

## Security Considerations

1. **Authorization**: Users can only update their own preferences
2. **Webhook Security**: HMAC signature on all webhook payloads
3. **Rate Limiting**: Prevent notification bombing attacks
4. **PII Protection**: Mask sensitive data in notifications
5. **Audit Logging**: All notification deliveries are logged
6. **Secret Storage**: Webhook URLs and secrets encrypted at rest

## Performance Considerations

1. **Preference Caching**: Redis cache for hot notification preferences
2. **Connection Pooling**: Reuse SMTP and HTTP connections
3. **Async Processing**: Non-blocking notification delivery
4. **Batch Processing**: Combine similar events into digests
5. **Circuit Breaker**: Fail fast when external services are down

## Monitoring & Observability

### Metrics

```typescript
// Prometheus metrics
notificationRouter.counter('notifications_sent_total', { channel, severity });
notificationRouter.counter('notifications_failed_total', { channel, error });
notificationRouter.histogram('notification_delivery_duration_seconds', { channel });
notificationRouter.gauge('websocket_connections_active', { });
notificationRouter.counter('notifications_throttled_total', { reason });
```

### Health Checks

```typescript
GET /health/notification-router
{
  status: 'healthy',
  websocketConnections: 142,
  emailQueueDepth: 5,
  slackCircuitBreakerOpen: false,
  lastSuccessfulDelivery: '2025-11-25T10:30:00Z'
}
```

## Deployment

### Service Dependencies

```yaml
services:
  notification-router:
    depends_on:
      - postgres
      - redis
      - kafka  # or use postgres NOTIFY
    environment:
      - SMTP_HOST
      - SMTP_PORT
      - SMTP_USER
      - SMTP_PASSWORD
      - SLACK_BOT_TOKEN (optional)
      - WEBHOOK_SIGNING_SECRET
```

### Scaling

- **Horizontal Scaling**: Multiple router instances with Redis pub/sub
- **Kafka Partitioning**: Partition by user_id for ordered delivery
- **WebSocket Sticky Sessions**: Use Redis adapter for Socket.IO

## Migration Plan

### Phase 1: Infrastructure (Week 1)
- [ ] Create database schema
- [ ] Implement notification router service
- [ ] Set up Redis caching
- [ ] Add WebSocket delivery

### Phase 2: Channels (Week 2)
- [ ] Implement email service
- [ ] Implement Slack service
- [ ] Add webhook delivery
- [ ] Create notification templates

### Phase 3: User Preferences (Week 3)
- [ ] Implement preferences API
- [ ] Add GraphQL mutations/queries
- [ ] Build preferences UI
- [ ] Add notification bell component

### Phase 4: Advanced Features (Week 4)
- [ ] Implement throttling and batching
- [ ] Add digest emails
- [ ] Implement quiet hours
- [ ] Add escalation rules

### Phase 5: Testing & Rollout
- [ ] Integration tests
- [ ] Load testing
- [ ] Beta rollout (10% of users)
- [ ] Full production rollout

## Future Enhancements

1. **SMS/Push Notifications**: Twilio integration for critical alerts
2. **Microsoft Teams**: Teams channel integration
3. **PagerDuty Integration**: Incident management integration
4. **AI-Powered Summarization**: Smart notification grouping
5. **Notification Analytics**: User engagement metrics
6. **Mobile App Support**: Native push notifications

## References

- [Audit System Design](./audit-system-design.md)
- [HMAC Signature Strategy](./hmac-signature-strategy.md)
- [WebSocket Architecture](../websocket-architecture.md)
- [Email Service Documentation](../services/email-service.md)
