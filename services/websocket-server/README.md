# WebSocket Server - High-Availability Real-Time Infrastructure

Production-ready WebSocket server for the Summit IntelGraph platform with horizontal scalability, message persistence, and comprehensive monitoring.

## Features

- ✅ **High Availability**: Horizontal scaling with Redis pub/sub adapter
- ✅ **JWT Authentication**: Secure token-based authentication
- ✅ **Connection Management**: Advanced connection pooling and state tracking
- ✅ **Presence Tracking**: Real-time user presence with online/away/busy states
- ✅ **Room-Based Messaging**: Multi-tenant room subscriptions
- ✅ **Message Persistence**: Redis-backed message storage for replay
- ✅ **Auto-Reconnection**: Client SDK with automatic reconnection and message queuing
- ✅ **Rate Limiting**: Token bucket algorithm for connection and message rate limits
- ✅ **Prometheus Metrics**: Comprehensive metrics for monitoring
- ✅ **Graceful Shutdown**: Zero-downtime deployments
- ✅ **Health Checks**: Kubernetes-ready liveness and readiness probes

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Client SDK    │◄────►│  WS Server 1    │◄────►│   Redis Pub/Sub │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                  ▲                         ▲
┌─────────────────┐              │                         │
│   Client SDK    │◄─────────────┼─────────────────────────┘
└─────────────────┘              │
                         ┌─────────────────┐
                         │  WS Server 2    │
                         └─────────────────┘
                                  │
                         ┌─────────────────┐
                         │  WS Server N    │
                         └─────────────────┘
```

### Components

1. **Socket.IO Server**: WebSocket server with fallback to polling
2. **Redis Adapter**: Multi-instance synchronization
3. **Connection Manager**: Tracks connection state and metadata
4. **Presence Manager**: User presence across rooms
5. **Room Manager**: Room subscription management
6. **Message Persistence**: Redis-backed message storage
7. **Rate Limiter**: Token bucket rate limiting
8. **Metrics Collector**: Prometheus metrics

## Quick Start

### Development

```bash
# Navigate to service directory
cd services/websocket-server

# Copy environment template
cp .env.example .env

# Edit .env and set required values
# - JWT_SECRET (minimum 32 characters)
# - REDIS_HOST, REDIS_PORT

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Docker Compose

```bash
# From project root
docker-compose up websocket-server
```

### Kubernetes

```bash
# Apply configurations
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/hpa.yaml

# Check status
kubectl get pods -l app=websocket-server
kubectl logs -l app=websocket-server -f
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `9001` | No |
| `HOST` | Bind host | `0.0.0.0` | No |
| `NODE_ENV` | Environment | `development` | No |
| `REDIS_HOST` | Redis hostname | `localhost` | Yes |
| `REDIS_PORT` | Redis port | `6379` | No |
| `REDIS_PASSWORD` | Redis password | - | No |
| `JWT_SECRET` | JWT signing secret | - | **Yes** |
| `CORS_ORIGIN` | Allowed origins | `http://localhost:3000` | Yes |
| `CLUSTERING_ENABLED` | Enable clustering | `true` | No |
| `PERSISTENCE_ENABLED` | Enable message persistence | `true` | No |
| `PERSISTENCE_TTL` | Message TTL (seconds) | `3600` | No |
| `HEARTBEAT_INTERVAL` | Heartbeat interval (ms) | `30000` | No |
| `HEARTBEAT_TIMEOUT` | Heartbeat timeout (ms) | `60000` | No |

### Production Requirements

For production deployments:

1. **JWT_SECRET** must be at least 64 characters
2. **CORS_ORIGIN** must not include localhost
3. Redis must be configured with persistence
4. Use TLS/SSL for production traffic

## Client SDK Usage

### Installation

```bash
npm install @intelgraph/websocket-client
```

### Basic Usage

```typescript
import WebSocketClient from '@intelgraph/websocket-client';

// Create client instance
const client = new WebSocketClient({
  url: 'ws://localhost:9001',
  token: 'your-jwt-token',
  tenantId: 'your-tenant-id',
  autoConnect: true,
});

// Listen to connection status
client.on('status:change', (status) => {
  console.log('Connection status:', status);
});

// Listen to connection established
client.on('connection:established', ({ connectionId, tenantId }) => {
  console.log('Connected:', connectionId);
});

// Join a room
await client.joinRoom('investigation:123', {
  investigationId: '123',
});

// Listen for messages
client.on('room:message', (message) => {
  console.log('Message received:', message);
});

// Send a message
await client.sendMessage('investigation:123', {
  type: 'comment',
  text: 'Hello, world!',
}, true); // persistent=true

// Update presence
client.setPresenceStatus('away');

// Disconnect
client.disconnect();
```

### Advanced Features

```typescript
// Query presence in a room
const presence = await client.queryPresence('investigation:123');
console.log('Users online:', presence);

// Query joined rooms
const rooms = await client.queryRooms();
console.log('My rooms:', rooms);

// Handle system events
client.on('system:restart', ({ reason, reconnectIn }) => {
  console.log('Server restarting:', reason);
  // Client will auto-reconnect
});

// Handle errors
client.on('system:error', ({ code, message }) => {
  console.error('Error:', code, message);
});
```

## API Reference

### Client → Server Events

#### `presence:heartbeat`

Keep presence alive.

```typescript
{
  status?: 'online' | 'away' | 'busy' | 'offline'
}
```

#### `presence:status`

Update presence status.

```typescript
{
  status: 'online' | 'away' | 'busy' | 'offline',
  metadata?: Record<string, unknown>
}
```

#### `room:join`

Join a room.

```typescript
{
  room: string,
  metadata?: Record<string, unknown>
}
// Response: { success: boolean, error?: string }
```

#### `room:leave`

Leave a room.

```typescript
{
  room: string
}
// Response: { success: boolean }
```

#### `room:send`

Send message to a room.

```typescript
{
  room: string,
  payload: unknown,
  persistent?: boolean
}
// Response: { success: boolean, messageId?: string }
```

#### `query:presence`

Query presence in a room.

```typescript
{
  room: string
}
// Response: { presence: PresenceInfo[] }
```

#### `query:rooms`

Query user's joined rooms.

```typescript
// Response: { rooms: string[] }
```

### Server → Client Events

#### `connection:established`

Connection established.

```typescript
{
  connectionId: string,
  tenantId: string
}
```

#### `presence:update`

Presence updated in a room.

```typescript
{
  room: string,
  presence: PresenceInfo[]
}
```

#### `presence:join`

User joined room.

```typescript
{
  room: string,
  user: PresenceInfo
}
```

#### `presence:leave`

User left room.

```typescript
{
  room: string,
  userId: string
}
```

#### `room:joined`

Successfully joined room.

```typescript
{
  room: string,
  metadata?: unknown
}
```

#### `room:left`

Successfully left room.

```typescript
{
  room: string
}
```

#### `room:message`

Message received in room.

```typescript
{
  id: string,
  room: string,
  from: string,
  payload: unknown,
  timestamp: number
}
```

#### `system:restart`

Server restarting.

```typescript
{
  reason: string,
  reconnectIn: number
}
```

#### `system:error`

System error occurred.

```typescript
{
  code: string,
  message: string
}
```

## Monitoring

### Health Endpoints

- `GET /health` - Overall health status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /metrics` - Prometheus metrics
- `GET /stats` - Connection statistics (debug)

### Prometheus Metrics

Key metrics exposed:

- `websocket_active_connections` - Active connections by tenant and status
- `websocket_connections_total` - Total connections
- `websocket_messages_sent_total` - Total messages sent
- `websocket_messages_received_total` - Total messages received
- `websocket_message_latency_ms` - Message processing latency
- `websocket_active_rooms` - Active rooms
- `websocket_room_subscriptions` - Room subscriptions
- `websocket_errors_total` - Errors by type
- `websocket_redis_latency_ms` - Redis operation latency
- `websocket_event_loop_lag_ms` - Event loop lag

### Grafana Dashboard

Import the dashboard from `observability/grafana-dashboard.json`.

## Scaling

### Horizontal Scaling

The WebSocket server supports horizontal scaling via Redis pub/sub:

```yaml
# Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Pods
      pods:
        metric:
          name: websocket_active_connections
        target:
          type: AverageValue
          averageValue: "5000"
```

### Load Balancing

Use sticky sessions (session affinity) for optimal performance:

```nginx
# Nginx example
upstream websocket_servers {
    ip_hash;  # Sticky sessions
    server ws1.example.com:9001;
    server ws2.example.com:9001;
    server ws3.example.com:9001;
}
```

### Capacity Planning

Recommended limits per instance:

- **Max connections**: 10,000 concurrent connections
- **CPU**: 1 core per 2,500 connections
- **Memory**: 512MB base + 100MB per 1,000 connections
- **Redis**: High-availability cluster for production

## Security

### Authentication

- JWT-based authentication
- Token validation on every connection
- Configurable token expiration
- Support for refresh tokens

### Authorization

- Room-based access control
- Tenant isolation
- Customizable authorization handlers

### Rate Limiting

Token bucket algorithm with configurable limits:

- Connection rate limiting
- Message rate limiting
- Per-user and per-tenant limits

### Best Practices

1. Use TLS/SSL in production
2. Rotate JWT secrets regularly
3. Set strong CORS policies
4. Monitor for abuse patterns
5. Implement request signing for critical operations

## Troubleshooting

### Connection Issues

```bash
# Check server health
curl http://localhost:9001/health

# Check Redis connectivity
redis-cli -h localhost -p 6379 ping

# View server logs
docker logs summit-websocket-server -f

# Check connection stats
curl http://localhost:9001/stats | jq
```

### High Memory Usage

- Check for connection leaks
- Monitor message queue sizes
- Adjust persistence TTL
- Review message sizes

### Message Delivery Issues

- Verify Redis connectivity
- Check clustering status
- Review rate limit settings
- Monitor Redis latency

## Testing

### Unit Tests

```bash
npm test
```

### Load Testing

```bash
# Using artillery
npm install -g artillery
artillery run tests/load-test.yml
```

### Integration Tests

```bash
npm run test:integration
```

## Contributing

See [CLAUDE.md](../../CLAUDE.md) for development guidelines.

## License

Proprietary - Summit/IntelGraph Platform

## Support

For issues and questions:
- GitHub Issues: https://github.com/BrianCLong/summit/issues
- Internal Documentation: [docs/websocket-infrastructure.md](../../docs/websocket-infrastructure.md)
