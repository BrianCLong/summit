# @summit/api-gateway

Enterprise API Gateway package with intelligent routing, load balancing, and circuit breaker patterns.

## Installation

```bash
pnpm add @summit/api-gateway
```

## Usage

```typescript
import { APIGateway } from '@summit/api-gateway';

const gateway = new APIGateway({
  routes: [
    {
      path: '/api/v1/users',
      backends: [
        { url: 'http://backend1:3000', weight: 2 },
        { url: 'http://backend2:3000', weight: 1 },
      ],
    },
  ],
  loadBalancing: {
    strategy: 'weighted-round-robin',
  },
  circuitBreaker: {
    threshold: 5,
    timeout: 60000,
  },
});
```

## Features

- Intelligent request routing
- Multiple load balancing strategies
- Circuit breaker pattern
- Protocol support (HTTP/HTTPS, WebSocket, gRPC)
- Retry policies
- Timeout management

## Documentation

See [API Gateway Guide](../../docs/api-gateway/GUIDE.md) for complete documentation.
