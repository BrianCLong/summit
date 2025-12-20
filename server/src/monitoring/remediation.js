import pino from 'pino';
import { serviceAutoRemediationsTotal } from './metrics.js';

const logger = pino({ name: 'auto-remediation' });
const COOLDOWN_MS = 5 * 60 * 1000;
const lastExecution = new Map();
const registry = new Map();

/**
 * Generates a cache key for rate limiting remediation actions.
 *
 * @param service - The name of the service.
 * @param action - The name of the remediation action.
 * @returns A string key.
 */
function getCooldownKey(service, action) {
  return `${service}:${action}`;
}

/**
 * Registers a remediation handler for a specific service.
 *
 * @param service - The service name to target (e.g., 'database').
 * @param actionName - A unique name for the remediation action.
 * @param handler - The async function to execute when remediation is triggered.
 */
export function registerRemediationHandler(service, actionName, handler) {
  const key = service.toLowerCase();
  if (!registry.has(key)) {
    registry.set(key, []);
  }

  registry.get(key).push({ name: actionName, execute: handler });
}

/**
 * Executes a remediation action and tracks its success/failure metrics.
 *
 * @param service - The service name.
 * @param actionName - The action name.
 * @param action - The action function.
 * @param context - Contextual data passed to the action.
 */
async function executeWithMetrics(service, actionName, action, context) {
  const metricLabels = { service, action: actionName, result: 'success' };
  try {
    await action(context);
    serviceAutoRemediationsTotal.inc(metricLabels);
    logger.info(
      { service, action: actionName },
      'Auto-remediation executed successfully',
    );
  } catch (error) {
    metricLabels.result = 'failed';
    serviceAutoRemediationsTotal.inc(metricLabels);
    logger.error(
      {
        service,
        action: actionName,
        error: error instanceof Error ? error.message : error,
      },
      'Auto-remediation action failed',
    );
  }
}

/**
 * Evaluates the health status of services and triggers registered remediation handlers for failing checks.
 * Honors a cooldown period to prevent flapping.
 *
 * @param healthStatus - The health status object containing checks for various services.
 */
export async function evaluateHealthForRemediation(healthStatus) {
  if (!healthStatus || healthStatus.status === 'healthy') {
    return;
  }

  const checks = healthStatus.checks || {};
  const now = Date.now();

  for (const [service, check] of Object.entries(checks)) {
    if (!check || check.status === 'healthy') {
      continue;
    }

    const serviceKey = service.toLowerCase();
    const actions = registry.get(serviceKey);
    if (!actions || actions.length === 0) {
      logger.debug(
        { service },
        'No remediation handlers registered for service',
      );
      continue;
    }

    for (const { name, execute } of actions) {
      const cooldownKey = getCooldownKey(serviceKey, name);
      const lastRun = lastExecution.get(cooldownKey) ?? 0;
      if (now - lastRun < COOLDOWN_MS) {
        logger.debug(
          { service, action: name },
          'Skipping remediation due to cooldown',
        );
        continue;
      }

      await executeWithMetrics(serviceKey, name, execute, {
        healthStatus,
        failingCheck: check,
      });
      lastExecution.set(cooldownKey, now);
    }
  }
}

registerRemediationHandler('database', 'recycle-write-pool', async () => {
  logger.warn(
    'Attempting to recycle Postgres connection pool after failed health check',
  );
});

registerRemediationHandler('redis', 'flush-connection', async () => {
  logger.warn(
    'Triggering Redis client flush to recover from connectivity failure',
  );
});

registerRemediationHandler('neo4j', 'reset-driver', async () => {
  logger.warn('Scheduling Neo4j driver reset due to health degradation');
});

registerRemediationHandler('mlService', 'disable-async-queue', async () => {
  logger.warn('Pausing ML async queue dispatch while the service is unhealthy');
});
