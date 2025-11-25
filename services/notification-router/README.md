# Notification Router Service

Real-time notification routing and delivery service for IntelGraph audit events.

## Features

- **Multi-Channel Delivery**: WebSocket, Email, Slack, Webhooks
- **Smart Routing**: Severity-based channel selection
- **Intelligent Throttling**: Rate limiting, deduplication, quiet hours
- **User Preferences**: Granular control over notifications
- **Batch Processing**: Digest emails for low-priority events
- **Audit Trail**: Complete delivery history

## Architecture

See [docs/audit/real-time-notification-architecture.md](/docs/audit/real-time-notification-architecture.md) for detailed architecture documentation.

## Quick Start

### Installation

```bash
pnpm install
```

### Configuration

Create a `.env` file:

```bash
# Database
DATABASE_URL=postgresql://localhost:5432/intelgraph

# Redis
REDIS_URL=redis://localhost:6379

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@example.com
SMTP_PASSWORD=your-password
SMTP_FROM=IntelGraph Notifications <notifications@example.com>

# Slack (optional)
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_DEFAULT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Service
BASE_URL=http://localhost:3000
PORT=3003
ENABLE_AUTO_ROUTING=true
```

### Development

```bash
pnpm dev
```

### Production

```bash
pnpm build
pnpm start
```

## Usage

### As a Service

The notification router can run as a standalone service that listens to PostgreSQL NOTIFY events:

```typescript
import { NotificationRouter } from '@intelgraph/notification-router';

const router = new NotificationRouter({
  database: pgPool,
  redis: redisClient,
  emailDelivery: emailDelivery,
  slackDelivery: slackDelivery,
  websocketDelivery: websocketDelivery,
  baseUrl: 'https://intelgraph.io',
});

await router.start();
```

### Programmatic Usage

You can also trigger notifications programmatically:

```typescript
await router.processAuditEvent(eventId);
```

## Health Check

```bash
curl http://localhost:3003/health
```

Response:

```json
{
  "status": "healthy",
  "channels": {
    "websocket": true,
    "email": true,
    "slack": true
  },
  "stats": {
    "eventsProcessed": 1234,
    "notificationsSent": 5678,
    "notificationsFailed": 12,
    "notificationsThrottled": 234
  }
}
```

## Delivery Channels

### WebSocket

Real-time push notifications to connected web clients.

### Email

SMTP-based email delivery with HTML templates.

### Slack

Slack messages using Incoming Webhooks or Bot API with rich Block Kit formatting.

### Webhooks

HTTP POST to user-configured endpoints with HMAC signature verification.

## Throttling

The notification router includes intelligent throttling to prevent notification fatigue:

- **Rate Limiting**: Max notifications per minute/hour
- **Deduplication**: Suppress duplicate events within time window
- **Quiet Hours**: Respect user-defined do-not-disturb periods
- **Batching**: Combine similar events into digest notifications

Critical and emergency notifications bypass throttling.

## Severity Calculation

Notifications are assigned severity levels based on:

- Audit event level (debug, info, warn, error, critical)
- Compliance framework impact (GDPR, HIPAA, SOC2)
- Event type (security alerts, data deletion, access denied)
- Legal hold status
- Data classification
- Operation outcome (success/failure)

Severity levels:
- **Low**: Informational, digest-only
- **Medium**: Important, throttled delivery
- **High**: Urgent, immediate delivery
- **Critical**: High priority, all channels
- **Emergency**: Immediate response required, bypass quiet hours

## Testing

```bash
pnpm test
```

## License

Proprietary - IntelGraph Team
