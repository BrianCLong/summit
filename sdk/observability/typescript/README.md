# Observability First TypeScript SDK

Provides a one-line bootstrap for Node services to emit OpenTelemetry traces, metrics, and structured logs.

```ts
import { initObservability, getLogger } from '@summit/observability-sdk';

await initObservability({ serviceName: 'checkout-api' });
const logger = getLogger({ serviceName: 'checkout-api' });

logger.info({ route: '/orders' }, 'request accepted');
```

The SDK registers histogram and counter instruments that match the shared metric catalogue and configures Pino for JSON logs with optional PII redaction.
