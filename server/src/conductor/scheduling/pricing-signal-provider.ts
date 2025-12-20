import logger from '../../config/logger.js';

export type PricingSignal = {
  cpu_sec_usd: number;
  gb_sec_usd: number;
  egress_gb_usd: number;
};

export interface PricingSignalProvider {
  fetch(): Promise<Record<string, PricingSignal>>;
}

export const BASELINE_PRICING_SIGNALS: Record<string, PricingSignal> = {
  'eu-west-1-pool-a': {
    cpu_sec_usd: 0.000015,
    gb_sec_usd: 0.00001,
    egress_gb_usd: 0.12,
  },
  'us-east-1-pool-a': {
    cpu_sec_usd: 0.000012,
    gb_sec_usd: 0.000009,
    egress_gb_usd: 0.09,
  },
};

export function normalizePricingSignal(
  raw: any,
): PricingSignal | null {
  const cpu = Number(raw?.cpu_sec_usd);
  const gb = Number(raw?.gb_sec_usd);
  const egress = Number(raw?.egress_gb_usd);

  if (
    !Number.isFinite(cpu) ||
    !Number.isFinite(gb) ||
    !Number.isFinite(egress)
  ) {
    return null;
  }

  if (cpu < 0 || gb < 0 || egress < 0) {
    return null;
  }

  return {
    cpu_sec_usd: cpu,
    gb_sec_usd: gb,
    egress_gb_usd: egress,
  };
}

export function sanitizePricingSignals(
  rawSignals: Record<string, any>,
): {
  signals: Record<string, PricingSignal>;
  invalid: string[];
} {
  const sanitized: Record<string, PricingSignal> = {};
  const invalid: string[] = [];

  if (!rawSignals || typeof rawSignals !== 'object') {
    return { signals: sanitized, invalid };
  }

  for (const [poolId, raw] of Object.entries(rawSignals)) {
    const normalized = normalizePricingSignal(raw);
    if (!normalized) {
      invalid.push(poolId);
      continue;
    }
    sanitized[poolId] = normalized;
  }

  return { signals: sanitized, invalid };
}

export class EnvJsonPricingSignalProvider
  implements PricingSignalProvider
{
  constructor(private readonly envKey = 'PRICING_SIGNALS_JSON') {}

  async fetch(): Promise<Record<string, PricingSignal>> {
    const raw = process.env[this.envKey];

    if (!raw) {
      logger.info(
        'Pricing signal env not set; using baseline pricing signals',
        { provider: 'env-json' },
      );
      const baseline = { ...BASELINE_PRICING_SIGNALS };
      Object.defineProperty(baseline, '__invalidPools', {
        value: [],
        enumerable: false,
      });
      return baseline;
    }

    try {
      const parsed = JSON.parse(raw);
      const { signals, invalid } = sanitizePricingSignals(parsed);

      if (invalid.length) {
        logger.warn('Invalid pricing signals skipped from env', {
          invalidPools: invalid,
        });
      }

      if (Object.keys(signals).length === 0) {
        logger.warn(
          'No valid pricing signals found in env; using baseline',
          { provider: 'env-json' },
        );
        const baseline = { ...BASELINE_PRICING_SIGNALS };
        Object.defineProperty(baseline, '__invalidPools', {
          value: invalid,
          enumerable: false,
        });
        return baseline;
      }

      const result = { ...signals };
      Object.defineProperty(result, '__invalidPools', {
        value: invalid,
        enumerable: false,
      });

      return result;
    } catch (error: any) {
      logger.warn('Failed to parse PRICING_SIGNALS_JSON, using baseline', {
        error: error.message,
      });
      const baseline = { ...BASELINE_PRICING_SIGNALS };
      Object.defineProperty(baseline, '__invalidPools', {
        value: [],
        enumerable: false,
      });
      return baseline;
    }
  }
}
