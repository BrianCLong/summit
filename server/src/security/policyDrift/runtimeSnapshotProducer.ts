import { effectivePolicySnapshotSchema, NormalizedPolicy, redactNormalized, computeSnapshotId } from './types.js';

function getTelemetry(): any {
  return null;
}

function normalizeRuntimeEnv(): NormalizedPolicy {
  const approvalsRaw = process.env.APPROVAL_REQUIRED_TOOLS || '';
  const approvalRequirements = approvalsRaw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .reduce<Record<string, string[]>>((acc, tool) => {
      acc[tool] = ['security-review'];
      return acc;
    }, {});

  const riskWeightsRaw = process.env.RISK_WEIGHT_MAP;
  const riskWeights: Record<string, number> = {};
  if (riskWeightsRaw) {
    try {
      Object.assign(riskWeights, JSON.parse(riskWeightsRaw));
    } catch {
      riskWeights.default = 1;
    }
  } else {
    riskWeights.default = 1;
  }

  return {
    toolAllowlist: (process.env.TOOL_ALLOWLIST || '').split(',').filter(Boolean),
    toolDenylist: (process.env.TOOL_DENYLIST || '').split(',').filter(Boolean),
    budgets: {
      globalUsdCap: Number(process.env.BUDGET_CAP_USD || 10),
      rateLimitPerMinute: Number(process.env.RATE_LIMIT_MAX || 600),
    },
    strictAttribution: process.env.STRICT_ATTRIBUTION !== 'false',
    approvalRequirements,
    riskWeights,
    redaction: {
      enabled: process.env.REDACTION_ENABLED !== 'false',
      strategy: process.env.REDACTION_STRATEGY || 'mask',
      fields: (process.env.REDACTION_FIELDS || 'token,secret').split(',').map((f) => f.trim()).filter(Boolean),
    },
  };
}

export function createRuntimeSnapshot(options: { environment?: string; tenant?: string } = {}) {
  const normalized = normalizeRuntimeEnv();
  const snapshot = effectivePolicySnapshotSchema.parse({
    snapshotId: '',
    metadata: {
      timestamp: new Date().toISOString(),
      environment: options.environment || process.env.NODE_ENV || 'dev',
      tenant: options.tenant,
      gitCommit: process.env.GIT_COMMIT_SHA,
      policySchemaVersion: '1.0',
      serviceVersion: process.env.npm_package_version,
      sourcePrecedence: ['env', 'runtime'],
      changeActor: process.env.LAST_CONFIG_ACTOR || 'unknown',
    },
    normalized: redactNormalized(normalized),
  });
  snapshot.snapshotId = computeSnapshotId(snapshot);
  const telemetry = getTelemetry();
  (telemetry as any)?.subsystems?.security?.policySnapshotRequested?.add?.(1);
  return snapshot;
}
