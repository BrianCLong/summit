import logger from './utils/logger.js';

// No-op diagnostics

// No-op resource attributes
const resource = {
  attributes: {
    'service.name': 'intelgraph-server',
    'service.version': process.env.GIT_SHA || process.env.npm_package_version || 'dev',
    'service.namespace': 'intelgraph',
    'deployment.environment': process.env.NODE_ENV || 'local',
  }
} as any;

// No-op exporters

// No-op instrumentations
const instrumentations: any[] = [];

// No-op SDK
export const sdk: any = {
  start: async () => {},
  shutdown: async () => {},
};

let started = false;

export async function startOtel(): Promise<void> {
  if (started) return;
  started = true;

  try {
    logger.info('Observability (OTel) disabled; starting no-op telemetry.');
    await sdk.start();

    // Graceful shutdown handling
    const shutdown = async () => {
      try { await sdk.shutdown(); } catch {}
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.warn('Continuing with no-op telemetry', { error: (error as Error).message });
  }
}

export function isOtelStarted() {
  return started;
}

// Health check span for validation (no-op)
export function createHealthSpan(_spanName: string = 'health-check') {
  return { end: () => {}, setAttributes: (_: any) => {} };
}

// Export tracer for manual instrumentation (no-op)
export function getTracer(_name: string = 'intelgraph') {
  return { startSpan: (_n: string, _o?: any) => ({ end: () => {}, setAttributes: (_: any) => {} }) };
}

// Environment validation
export function validateOtelConfig(): boolean {
  return false;
}
