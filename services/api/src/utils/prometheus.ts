import client from 'prom-client';

// Register a default metrics registry
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Define OPA Router Authorization Counters
export const opaRouterAuthzCounter = new client.Counter({
  name: 'opa_router_authz_total',
  help: 'Total number of OPA router authorization decisions',
  labelNames: ['decision', 'reason'],
  registers: [register],
});

export const rateLimitCounter = new client.Counter({
  name: 'rate_limit_total',
  help: 'Total number of rate limit events',
  labelNames: ['status'],
  registers: [register],
});

export const circuitBreakerCounter = new client.Counter({
  name: 'circuit_breaker_total',
  help: 'Total number of circuit breaker state changes',
  labelNames: ['state'],
  registers: [register],
});

// Export the registry for use in metrics endpoint
export { register };
