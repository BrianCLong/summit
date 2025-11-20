# Summit API Gateway Service

Enterprise API Gateway for Summit Intelligence Platform.

## Features

- ✅ Intelligent request routing with multiple load balancing strategies
- ✅ OAuth 2.0, JWT, and API key authentication
- ✅ Distributed rate limiting with Redis
- ✅ Circuit breaker pattern for resilience
- ✅ Real-time metrics and monitoring
- ✅ Protocol support (HTTP/HTTPS, WebSocket, gRPC)
- ✅ API versioning and lifecycle management
- ✅ Request/response transformation
- ✅ Security features (DDoS protection, input validation)

## Quick Start

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Configuration

See `.env.example` for all configuration options.

## Documentation

- [API Gateway Guide](../../docs/api-gateway/GUIDE.md)
- [Authentication Guide](../../docs/api/AUTHENTICATION.md)
- [Best Practices](../../docs/api/BEST_PRACTICES.md)
