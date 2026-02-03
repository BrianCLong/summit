export type RateLimitStore = 'memory' | 'redis';

export type RateLimitRouteGroup = 'default' | 'webhookIngest' | 'governance' | 'caseWorkflow';

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export interface RateLimitConfig {
  enabled: boolean;
  store: RateLimitStore;
  groups: Record<RateLimitRouteGroup, RateLimitRule>;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return fallback;
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadRateLimitConfig(env: NodeJS.ProcessEnv = process.env): RateLimitConfig {
  const enabled = parseBool(env.RATE_LIMIT_ENABLED, false);
  const store: RateLimitStore = env.RATE_LIMIT_STORE === 'redis' ? 'redis' : 'memory';

  const defaultWindowMs = parseNumber(env.RATE_LIMIT_DEFAULT_WINDOW_MS, 60_000);
  const defaultLimit = parseNumber(env.RATE_LIMIT_DEFAULT_LIMIT, 100);
  const webhookWindowMs = parseNumber(env.RATE_LIMIT_WEBHOOK_WINDOW_MS, defaultWindowMs);
  const webhookLimit = parseNumber(env.RATE_LIMIT_WEBHOOK_LIMIT, 30);
  const governanceWindowMs = parseNumber(env.RATE_LIMIT_GOVERNANCE_WINDOW_MS, defaultWindowMs);
  const governanceLimit = parseNumber(env.RATE_LIMIT_GOVERNANCE_LIMIT, 30);
  const caseWorkflowWindowMs = parseNumber(env.RATE_LIMIT_CASE_WORKFLOW_WINDOW_MS, defaultWindowMs);
  const caseWorkflowLimit = parseNumber(env.RATE_LIMIT_CASE_WORKFLOW_LIMIT, 60);

  return {
    enabled,
    store,
    groups: {
      default: { limit: defaultLimit, windowMs: defaultWindowMs },
      webhookIngest: { limit: webhookLimit, windowMs: webhookWindowMs },
      governance: { limit: governanceLimit, windowMs: governanceWindowMs },
      caseWorkflow: { limit: caseWorkflowLimit, windowMs: caseWorkflowWindowMs },
    },
  };
}

let currentConfig: RateLimitConfig = loadRateLimitConfig();

export function getRateLimitConfig(): RateLimitConfig {
  return currentConfig;
}

export function setRateLimitConfig(config: RateLimitConfig): void {
  currentConfig = config;
}

export function resetRateLimitConfig(env: NodeJS.ProcessEnv = process.env): RateLimitConfig {
  currentConfig = loadRateLimitConfig(env);
  return currentConfig;
}
