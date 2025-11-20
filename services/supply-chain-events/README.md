# Supply Chain Events Service

Real-time event streaming service for supply chain intelligence platform.

## Features

- **WebSocket Streaming**: Real-time event delivery to connected clients
- **Publish-Subscribe**: Topic-based message routing
- **Event Store**: In-memory event persistence with time-based queries
- **Pattern Matching**: Wildcard and pattern-based subscriptions
- **REST API**: HTTP interface for event publishing and querying

## Running

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

## WebSocket API

### Connect

```javascript
const ws = new WebSocket('ws://localhost:4022/ws');

ws.onopen = () => {
  console.log('Connected to event stream');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

### Subscribe to Topics

```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  topics: ['risk.assessment', 'incident.created', 'alert.*']
}));
```

### Unsubscribe

```javascript
ws.send(JSON.stringify({
  type: 'unsubscribe',
  topics: ['alert.*']
}));
```

### Publish Event

```javascript
ws.send(JSON.stringify({
  type: 'publish',
  topic: 'shipment.delayed',
  data: {
    shipmentId: 'SHIP-123',
    delayHours: 24,
    reason: 'port congestion'
  }
}));
```

## REST API

### Publish Event

```bash
POST /api/events/publish
{
  "topic": "risk.assessment.completed",
  "data": {
    "nodeId": "uuid",
    "riskScore": 75,
    "level": "medium"
  }
}
```

### Query Events

```bash
# Get recent events
GET /api/events?limit=100

# Get events for specific topic
GET /api/events?topic=incident.created&limit=50

# Get events since timestamp
GET /api/events?since=2024-01-01T00:00:00Z
```

### Get Event by ID

```bash
GET /api/events/:id
```

### Get Statistics

```bash
GET /api/events/stats
```

## Event Topics

### Risk Events
- `risk.assessment.started`
- `risk.assessment.completed`
- `risk.level.changed`
- `risk.threshold.exceeded`

### Incident Events
- `incident.created`
- `incident.updated`
- `incident.resolved`
- `incident.escalated`

### Alert Events
- `alert.triggered`
- `alert.acknowledged`
- `alert.resolved`

### Shipment Events
- `shipment.created`
- `shipment.status.changed`
- `shipment.delayed`
- `shipment.delivered`

### Compliance Events
- `compliance.check.completed`
- `compliance.violation.detected`
- `certification.expiring`
- `certification.expired`

### Node Events
- `node.created`
- `node.updated`
- `node.status.changed`
- `node.risk.changed`

## Pattern Matching

Supports wildcard patterns:
- `*` - Subscribe to all events
- `risk.*` - Subscribe to all risk events
- `incident.created` - Subscribe to specific event

## Environment Variables

- `PORT` - Server port (default: 4022)
- `LOG_LEVEL` - Logging level (default: info)

## Architecture

```
┌─────────────┐
│   Clients   │
│ (WebSocket) │
└─────┬───────┘
      │
┌─────▼───────┐     ┌──────────────┐
│  Event Bus  │────▶│ Event Store  │
│ (Pub/Sub)   │     │ (In-Memory)  │
└─────┬───────┘     └──────────────┘
      │
┌─────▼────────────────────────┐
│ Services (Publishers)        │
│ - supply-chain-service       │
│ - risk-assessment-service    │
│ - Integration adapters       │
└──────────────────────────────┘
```

## License

Proprietary - IntelGraph
