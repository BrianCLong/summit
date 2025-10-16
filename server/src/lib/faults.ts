/**
 * Chaos Engineering: Fault injection system for resilience testing
 * Injectable failures for Neo4j, Redis, and LLM providers
 */

import logger from '../utils/logger';

interface FaultFlags {
  neo4jFailRate: number;
  redisFailRate: number;
  providerFailRate: number;
  rateLimitFailRate: number;
  compensationFailRate: number;
  budgetLedgerFailRate: number;
  networkLatencyMs: number;
  memoryPressure: boolean;
  diskPressure: boolean;
}

interface FaultConfig {
  enabled: boolean;
  globalFailRate: number;
  faultDurationMs: number;
  affectedOperations: string[];
}

/**
 * Global fault injection state
 */
let faultFlags: FaultFlags = {
  neo4jFailRate: 0,
  redisFailRate: 0,
  providerFailRate: 0,
  rateLimitFailRate: 0,
  compensationFailRate: 0,
  budgetLedgerFailRate: 0,
  networkLatencyMs: 0,
  memoryPressure: false,
  diskPressure: false,
};

let faultConfig: FaultConfig = {
  enabled: process.env.CHAOS_ENABLED === 'true',
  globalFailRate: parseFloat(process.env.CHAOS_GLOBAL_FAIL_RATE || '0'),
  faultDurationMs: parseInt(process.env.CHAOS_DURATION_MS || '30000'),
  affectedOperations: (process.env.CHAOS_OPERATIONS || '')
    .split(',')
    .filter(Boolean),
};

let faultStats = {
  totalChecks: 0,
  totalInjections: 0,
  injectionsByType: {} as Record<string, number>,
  lastReset: new Date(),
};

/**
 * Update fault injection flags
 */
export function setFaults(updates: Partial<FaultFlags>): void {
  faultFlags = { ...faultFlags, ...updates };

  logger.info('Fault injection flags updated', {
    flags: faultFlags,
    enabled: faultConfig.enabled,
  });
}

/**
 * Update fault configuration
 */
export function setFaultConfig(updates: Partial<FaultConfig>): void {
  faultConfig = { ...faultConfig, ...updates };

  logger.info('Fault injection config updated', {
    config: faultConfig,
  });
}

/**
 * Check if a fault should be injected
 */
export function shouldInjectFault(
  faultType: keyof FaultFlags,
  operationName?: string,
): boolean {
  if (!faultConfig.enabled) {
    return false;
  }

  faultStats.totalChecks++;

  // Check operation-specific filtering
  if (operationName && faultConfig.affectedOperations.length > 0) {
    if (!faultConfig.affectedOperations.includes(operationName)) {
      return false;
    }
  }

  // Check global fail rate first
  if (
    faultConfig.globalFailRate > 0 &&
    Math.random() < faultConfig.globalFailRate
  ) {
    return recordInjection(faultType, 'global');
  }

  // Check specific fault rate
  const faultRate = faultFlags[faultType] as number;
  if (typeof faultRate === 'number' && faultRate > 0) {
    if (Math.random() < faultRate) {
      return recordInjection(faultType, 'specific');
    }
  }

  return false;
}

/**
 * Legacy flaky function for backward compatibility
 */
export function flaky(
  faultType: keyof FaultFlags,
  operationName?: string,
): boolean {
  return shouldInjectFault(faultType, operationName);
}

/**
 * Record fault injection for statistics
 */
function recordInjection(faultType: string, reason: string): boolean {
  faultStats.totalInjections++;
  faultStats.injectionsByType[faultType] =
    (faultStats.injectionsByType[faultType] || 0) + 1;

  logger.warn('Fault injected', {
    faultType,
    reason,
    totalInjections: faultStats.totalInjections,
  });

  return true;
}

/**
 * Inject Neo4j faults
 */
export function injectNeo4jFault(operation: string): Error | null {
  if (shouldInjectFault('neo4jFailRate', operation)) {
    const errorTypes = [
      'Connection refused',
      'Transaction timeout',
      'Database unavailable',
      'Write conflict',
      'Memory limit exceeded',
    ];
    const randomError =
      errorTypes[Math.floor(Math.random() * errorTypes.length)];
    return new Error(
      `Injected Neo4j fault: ${randomError} (operation: ${operation})`,
    );
  }
  return null;
}

/**
 * Inject Redis faults
 */
export function injectRedisFault(operation: string): Error | null {
  if (shouldInjectFault('redisFailRate', operation)) {
    const errorTypes = [
      'Connection timeout',
      'Redis server went away',
      'Out of memory',
      'Cluster failover in progress',
      'Key evicted',
    ];
    const randomError =
      errorTypes[Math.floor(Math.random() * errorTypes.length)];
    return new Error(
      `Injected Redis fault: ${randomError} (operation: ${operation})`,
    );
  }
  return null;
}

/**
 * Inject LLM provider faults
 */
export function injectProviderFault(
  provider: string,
  operation: string,
): Error | null {
  if (shouldInjectFault('providerFailRate', `${provider}-${operation}`)) {
    const errorTypes = [
      'Rate limit exceeded',
      'Service temporarily unavailable',
      'Invalid API key',
      'Model overloaded',
      'Context length exceeded',
      'Content policy violation',
    ];
    const randomError =
      errorTypes[Math.floor(Math.random() * errorTypes.length)];
    return new Error(
      `Injected ${provider} fault: ${randomError} (operation: ${operation})`,
    );
  }
  return null;
}

/**
 * Inject network latency
 */
export async function injectNetworkLatency(operation: string): Promise<void> {
  if (faultFlags.networkLatencyMs > 0) {
    const latency =
      faultFlags.networkLatencyMs +
      Math.random() * faultFlags.networkLatencyMs * 0.5;

    logger.debug('Injecting network latency', {
      operation,
      latencyMs: Math.round(latency),
    });

    await new Promise((resolve) => setTimeout(resolve, latency));
  }
}

/**
 * Check resource pressure faults
 */
export function hasResourcePressure(): {
  memory: boolean;
  disk: boolean;
} {
  return {
    memory: faultFlags.memoryPressure,
    disk: faultFlags.diskPressure,
  };
}

/**
 * Generic fault wrapper for async functions
 */
export async function withFaultInjection<T>(
  faultType: keyof FaultFlags,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  // Inject network latency first
  await injectNetworkLatency(operation);

  // Check for specific fault injection
  const fault = getFaultForType(faultType, operation);
  if (fault) {
    throw fault;
  }

  // Execute original function
  return await fn();
}

/**
 * Get fault for specific type
 */
function getFaultForType(
  faultType: keyof FaultFlags,
  operation: string,
): Error | null {
  switch (faultType) {
    case 'neo4jFailRate':
      return injectNeo4jFault(operation);
    case 'redisFailRate':
      return injectRedisFault(operation);
    case 'providerFailRate':
      return injectProviderFault('unknown', operation);
    case 'rateLimitFailRate':
      if (shouldInjectFault('rateLimitFailRate', operation)) {
        return new Error(
          `Injected rate limit fault: Rate limit exceeded (operation: ${operation})`,
        );
      }
      return null;
    case 'compensationFailRate':
      if (shouldInjectFault('compensationFailRate', operation)) {
        return new Error(
          `Injected compensation fault: Rollback failed (operation: ${operation})`,
        );
      }
      return null;
    case 'budgetLedgerFailRate':
      if (shouldInjectFault('budgetLedgerFailRate', operation)) {
        return new Error(
          `Injected budget ledger fault: Database write failed (operation: ${operation})`,
        );
      }
      return null;
    default:
      return null;
  }
}

/**
 * Fault injection scenarios for testing
 */
export const FaultScenarios = {
  /**
   * Total system failure - everything fails
   */
  apocalypse(): void {
    setFaults({
      neo4jFailRate: 1.0,
      redisFailRate: 1.0,
      providerFailRate: 1.0,
      rateLimitFailRate: 1.0,
      compensationFailRate: 1.0,
      budgetLedgerFailRate: 1.0,
      networkLatencyMs: 5000,
      memoryPressure: true,
      diskPressure: true,
    });
  },

  /**
   * Database instability - Neo4j and Redis intermittent failures
   */
  databaseChaos(): void {
    setFaults({
      neo4jFailRate: 0.3,
      redisFailRate: 0.2,
      providerFailRate: 0,
      rateLimitFailRate: 0.1,
      compensationFailRate: 0,
      budgetLedgerFailRate: 0.15,
      networkLatencyMs: 1000,
    });
  },

  /**
   * Provider instability - LLM services having issues
   */
  providerChaos(): void {
    setFaults({
      neo4jFailRate: 0,
      redisFailRate: 0,
      providerFailRate: 0.4,
      rateLimitFailRate: 0.6, // Rate limits often accompany provider issues
      compensationFailRate: 0,
      budgetLedgerFailRate: 0,
      networkLatencyMs: 2000,
    });
  },

  /**
   * Resource pressure - system under load
   */
  resourcePressure(): void {
    setFaults({
      neo4jFailRate: 0.05,
      redisFailRate: 0.05,
      providerFailRate: 0.1,
      rateLimitFailRate: 0.2,
      compensationFailRate: 0.1,
      budgetLedgerFailRate: 0.05,
      networkLatencyMs: 500,
      memoryPressure: true,
      diskPressure: false,
    });
  },

  /**
   * Network partition - high latency, intermittent failures
   */
  networkPartition(): void {
    setFaults({
      neo4jFailRate: 0.2,
      redisFailRate: 0.2,
      providerFailRate: 0.3,
      rateLimitFailRate: 0,
      compensationFailRate: 0.1,
      budgetLedgerFailRate: 0.2,
      networkLatencyMs: 10000,
    });
  },

  /**
   * Clear all faults - return to normal operation
   */
  clearAll(): void {
    setFaults({
      neo4jFailRate: 0,
      redisFailRate: 0,
      providerFailRate: 0,
      rateLimitFailRate: 0,
      compensationFailRate: 0,
      budgetLedgerFailRate: 0,
      networkLatencyMs: 0,
      memoryPressure: false,
      diskPressure: false,
    });
  },
};

/**
 * Get current fault statistics
 */
export function getFaultStats(): {
  config: FaultConfig;
  flags: FaultFlags;
  stats: typeof faultStats;
} {
  return {
    config: { ...faultConfig },
    flags: { ...faultFlags },
    stats: { ...faultStats },
  };
}

/**
 * Reset fault statistics
 */
export function resetFaultStats(): void {
  faultStats = {
    totalChecks: 0,
    totalInjections: 0,
    injectionsByType: {},
    lastReset: new Date(),
  };

  logger.info('Fault injection statistics reset');
}

/**
 * Express middleware to expose fault controls
 */
export function createFaultControlMiddleware() {
  return (req: any, res: any, next: any) => {
    if (req.path === '/chaos/faults' && req.method === 'GET') {
      res.json(getFaultStats());
    } else if (req.path === '/chaos/faults' && req.method === 'POST') {
      const { flags, config } = req.body;

      if (flags) setFaults(flags);
      if (config) setFaultConfig(config);

      res.json({ success: true, stats: getFaultStats() });
    } else if (req.path === '/chaos/scenarios' && req.method === 'POST') {
      const { scenario } = req.body;

      if (scenario && FaultScenarios[scenario as keyof typeof FaultScenarios]) {
        FaultScenarios[scenario as keyof typeof FaultScenarios]();
        res.json({ success: true, scenario, stats: getFaultStats() });
      } else {
        res
          .status(400)
          .json({
            error: 'Unknown scenario',
            availableScenarios: Object.keys(FaultScenarios),
          });
      }
    } else {
      next();
    }
  };
}
