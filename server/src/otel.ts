// @ts-nocheck
import { logger } from './config/logger.js';
import { initializeTracing } from './observability/tracer.js';

// Legacy OpenTelemetry entry point - redirects to new tracer implementation
// Maintained for backward compatibility and to satisfy build requirements

let started = false;

export async function startOtel(): Promise<void> {
  if (started) return;

  // If explicitly disabled via env var
  if (process.env.ENABLE_OTEL === 'false') {
      logger.info('Observability (OTel) explicitly disabled via env.');
      return;
  }

  started = true;

  try {
    logger.info('Starting OpenTelemetry SDK (via Tracer wrapper)...');
    const tracer = initializeTracing();
    await tracer.initialize();
    logger.info('OpenTelemetry SDK started successfully.');
  } catch (error: any) {
    logger.warn('Failed to start OpenTelemetry SDK', {
      error: (error as Error).message,
    });
  }
}

export function isOtelStarted() {
  return started;
}
