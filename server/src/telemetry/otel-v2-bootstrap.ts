/**
 * No-op OpenTelemetry v2 Bootstrap (API-compatible)
 */
import logger from '../utils/logger.js';

// No-op placeholders
const resource: any = { attributes: {} };

const traceExporter: any = {};

const metricReader: any = {};

// No-op SDK
const sdk: any = {
  start: async () => {},
  shutdown: async () => {},
};

// Initialize OpenTelemetry v2
export function initializeOTelV2(): void {
  try {
    logger.info('OTel v2 disabled (no-op).');
    sdk.start();
  } catch (error) {
    logger.warn('Failed to initialize OTel v2 (no-op path)', { error: (error as Error).message });
  }
}

// Graceful shutdown
export function shutdownOTel(): Promise<void> { return sdk.shutdown(); }

// Process signal handlers
process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});

export { sdk };
