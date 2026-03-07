function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function parseSpeculativeConfig(input = {}) {
  const enabled = input.enabled === true;
  const backend = input.backend ?? 'none';
  const tenantAllowlist = asArray(input.tenantAllowlist).filter(
    (entry) => typeof entry === 'string' && entry.trim().length > 0,
  );
  const evidenceId =
    typeof input.evidenceId === 'string' && input.evidenceId.length > 0
      ? input.evidenceId
      : undefined;

  const thresholds =
    input.thresholds && typeof input.thresholds === 'object'
      ? {
          minAcceptanceLength: Number(input.thresholds.minAcceptanceLength),
          minSpeedup: Number(input.thresholds.minSpeedup),
        }
      : undefined;

  const parsed = {
    enabled,
    backend,
    tenantAllowlist,
    evidenceId,
    thresholds,
  };

  if (!enabled) {
    return parsed;
  }

  if (!['http', 'sglang', 'vllm'].includes(backend)) {
    throw new Error(
      'Speculative mode requires a concrete backend when enabled.',
    );
  }

  if (tenantAllowlist.length === 0) {
    throw new Error(
      'Speculative mode requires a non-empty tenant allowlist when enabled.',
    );
  }

  if (!evidenceId) {
    throw new Error('Speculative mode requires an evidenceId when enabled.');
  }

  if (!thresholds) {
    throw new Error(
      'Speculative mode requires threshold configuration when enabled.',
    );
  }

  if (
    !Number.isFinite(thresholds.minAcceptanceLength) ||
    thresholds.minAcceptanceLength < 0
  ) {
    throw new Error('minAcceptanceLength must be a non-negative number.');
  }

  if (!Number.isFinite(thresholds.minSpeedup) || thresholds.minSpeedup <= 0) {
    throw new Error('minSpeedup must be a positive number.');
  }

  return parsed;
}

export function loadSpeculativeConfigFromEnv(env = process.env) {
  const enabled = env.SUMMIT_SPECULATIVE_ENABLED === 'true';
  const tenantAllowlist = env.SUMMIT_SPECULATIVE_TENANT_ALLOWLIST
    ? env.SUMMIT_SPECULATIVE_TENANT_ALLOWLIST.split(',').map((value) =>
        value.trim(),
      )
    : [];

  const minAcceptanceLength = env.SUMMIT_SPECULATIVE_MIN_ACCEPTANCE_LENGTH;
  const minSpeedup = env.SUMMIT_SPECULATIVE_MIN_SPEEDUP;

  return parseSpeculativeConfig({
    enabled,
    backend: env.SUMMIT_SPECULATIVE_BACKEND ?? 'none',
    tenantAllowlist,
    evidenceId: env.SUMMIT_SPECULATIVE_EVIDENCE_ID,
    thresholds:
      minAcceptanceLength && minSpeedup
        ? {
            minAcceptanceLength,
            minSpeedup,
          }
        : undefined,
  });
}

export function canUseSpeculativeMode(config, tenantId) {
  if (!config?.enabled || !tenantId) {
    return false;
  }
  return config.tenantAllowlist.includes(tenantId);
}
