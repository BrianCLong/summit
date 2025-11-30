# Summit Streaming API

Real-time streaming API supporting WebSocket and Server-Sent Events (SSE).

## Features

- **WebSocket Support**: Bidirectional real-time communication
- **Server-Sent Events**: Unidirectional streaming over HTTP
- **Topic-based Subscriptions**: Subscribe to specific data streams
- **Backpressure Handling**: Automatic flow control for high-volume streams
- **Automatic Reconnection**: Client-side reconnection with exponential backoff
- **Heartbeat Monitoring**: Detect and clean up dead connections
- **Message Acknowledgment**: Reliable message delivery
- **Authentication**: Token-based authentication for secure connections

## Installation

```bash
npm install @intelgraph/streaming-api
```

## Quick Start

### WebSocket

```typescript
import { StreamingWebSocketServer } from '@intelgraph/streaming-api';

const server = new StreamingWebSocketServer({ port: 8080 });

server.on('subscribe', ({ connectionId, topic }) => {
  console.log(`${connectionId} subscribed to ${topic}`);
});

// Broadcast events
server.broadcast('entities', {
  id: '123',
  topic: 'entities',
  type: 'created',
  data: { id: '1', name: 'New Entity' },
  timestamp: new Date(),
});
```

### Server-Sent Events

```typescript
import { SSEServer } from '@intelgraph/streaming-api';
import express from 'express';

const app = express();
const sse = new SSEServer();

app.get('/stream', (req, res) => {
  sse.handleConnection(req, res, {
    topics: ['entities', 'relationships'],
  });
});

// Broadcast events
sse.broadcast('entities', {
  id: '123',
  topic: 'entities',
  type: 'updated',
  data: { id: '1', name: 'Updated Entity' },
  timestamp: new Date(),
});
```

## Documentation

See the [Streaming API Guide](../../docs/api-reference/STREAMING_API_GUIDE.md) for comprehensive documentation.

## License

MIT
