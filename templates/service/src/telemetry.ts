import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { logger } from './utils/logger.js';

// Initialize OpenTelemetry SDK
export const initTelemetry = (serviceName: string) => {
  // In a real scenario, you'd configure exporters here (e.g., OTLP)
  // For now, we just enable auto-instrumentation hooks
  const sdk = new NodeSDK({
    serviceName,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  logger.info('OpenTelemetry initialized');

  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => logger.info('Tracing terminated'))
      .catch((error) => logger.error('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });
};
