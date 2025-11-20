# @intelgraph/logger

Structured logging with correlation IDs and audit trails for the IntelGraph platform.

## Features

- 🎯 **Structured Logging**: JSON-formatted logs with consistent schema
- 🔗 **Correlation IDs**: Track requests across distributed systems
- 🔒 **Audit Trails**: Security event tracking for compliance
- 🛡️ **Sensitive Data Redaction**: Automatic redaction of passwords, tokens, PII
- 📊 **Multiple Log Levels**: FATAL, ERROR, WARN, INFO, DEBUG, TRACE
- 🔄 **Log Rotation**: Automatic rotation with configurable policies
- 📦 **Log Aggregation**: Support for ELK stack, CloudWatch, and custom transports
- ⚡ **High Performance**: Built on Pino for minimal overhead
- 🔍 **Context Propagation**: Async context tracking with AsyncLocalStorage

## Installation

```bash
pnpm add @intelgraph/logger
```

## Quick Start

```typescript
import { logger } from '@intelgraph/logger';

// Simple logging
logger.info('Application started');

// Structured logging with metadata
logger.info('User logged in', {
  userId: 'user-123',
  tenantId: 'tenant-456',
});

// Error logging
try {
  await riskyOperation();
} catch (error) {
  logger.error(error, {
    context: 'riskyOperation',
    userId: 'user-123',
  });
}
```

## Documentation

See [docs/logging/STRUCTURED_LOGGING.md](../../docs/logging/STRUCTURED_LOGGING.md) for complete documentation.

## License

MIT
