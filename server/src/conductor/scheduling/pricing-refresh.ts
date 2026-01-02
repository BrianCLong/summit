// @ts-nocheck
import { Pool } from 'pg';
import logger from '../../config/logger.js';
import {
  EnvJsonPricingSignalProvider,
  PricingSignal,
  PricingSignalProvider,
  sanitizePricingSignals,
} from './pricing-signal-provider.js';
import {
  pricingRefreshLastSuccessTimestamp,
  pricingRefreshTotal,
} from '../observability/prometheus.js';

type PgClient = Pick<Pool, 'query'>;

export interface PricingRefreshOptions {
  pool?: PgClient;
  provider?: PricingSignalProvider;
  actor?: string;
  tenantId?: string;
  effectiveAt?: Date;
}

export interface PricingRefreshResult {
  updatedPools: number;
  skippedPools: number;
  effectiveAt: Date;
}

const defaultPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const defaultProvider = new EnvJsonPricingSignalProvider();

export async function refreshPricing(
  options: PricingRefreshOptions = {},
): Promise<PricingRefreshResult> {
  const pool = options.pool ?? defaultPool;
  const provider = options.provider ?? defaultProvider;
  const effectiveAt = options.effectiveAt ?? new Date();

  const start = Date.now();
  let skippedPools = 0;

  try {
    const rawSignals = await provider.fetch();
    const providerInvalid = Array.isArray(
      (rawSignals as Record<string, PricingSignal> & { __invalidPools?: unknown[] }).__invalidPools,
    )
      ? (rawSignals as Record<string, PricingSignal> & { __invalidPools: unknown[] }).__invalidPools.length
      : 0;

    const { signals, invalid } = sanitizePricingSignals(rawSignals);
    skippedPools += invalid.length + providerInvalid;

    const { rows } = await pool.query<{ id: string }>('SELECT id FROM pool_registry');
    const knownPools = new Set<string>(rows.map((r: any) => r.id));

    const entries: Array<[string, PricingSignal]> = [];
    for (const [poolId, signal] of Object.entries(signals)) {
      if (!knownPools.has(poolId)) {
        skippedPools += 1;
        continue;
      }
      entries.push([poolId, signal]);
    }

    if (entries.length) {
      const values: (string | number | Date)[] = [];
      const placeholders = entries.map(([poolId, signal], idx) => {
        const base = idx * 5;
        values.push(
          poolId,
          Number(signal.cpu_sec_usd),
          Number(signal.gb_sec_usd),
          Number(signal.egress_gb_usd),
          effectiveAt,
        );
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${
          base + 5
        })`;
      });

      const sql = `
        INSERT INTO pool_pricing (pool_id, cpu_sec_usd, gb_sec_usd, egress_gb_usd, effective_at)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (pool_id) DO UPDATE SET
          cpu_sec_usd = EXCLUDED.cpu_sec_usd,
          gb_sec_usd = EXCLUDED.gb_sec_usd,
          egress_gb_usd = EXCLUDED.egress_gb_usd,
          effective_at = EXCLUDED.effective_at
      `;

      await pool.query(sql, values);
    }

    pricingRefreshTotal.inc({ status: 'success' });
    pricingRefreshLastSuccessTimestamp.set(effectiveAt.getTime() / 1000);

    const durationMs = Date.now() - start;
    logger.info('Pricing refresh completed', {
      actor: options.actor,
      tenantId: options.tenantId,
      updatedPools: entries.length,
      skippedPools,
      durationMs,
      effectiveAt: effectiveAt.toISOString(),
    });

    return {
      updatedPools: entries.length,
      skippedPools,
      effectiveAt,
    };
  } catch (error: any) {
    pricingRefreshTotal.inc({ status: 'error' });
    logger.error('Pricing refresh failed', {
      actor: options.actor,
      tenantId: options.tenantId,
      error: error.message,
    });
    throw error;
  }
}
