import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import {
  BASELINE_PRICING_SIGNALS,
  EnvJsonPricingSignalProvider,
  sanitizePricingSignals,
} from '../pricing-signal-provider.js';

describe('EnvJsonPricingSignalProvider', () => {
  const originalEnv = process.env.PRICING_SIGNALS_JSON;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.PRICING_SIGNALS_JSON;
    } else {
      process.env.PRICING_SIGNALS_JSON = originalEnv;
    }
  });

  test('parses env json and coerces values to numbers', async () => {
    process.env.PRICING_SIGNALS_JSON = JSON.stringify({
      'pool-a': {
        cpu_sec_usd: '0.01',
        gb_sec_usd: '0.02',
        egress_gb_usd: '0.03',
      },
    });

    const provider = new EnvJsonPricingSignalProvider();
    const signals = await provider.fetch();

    expect(signals['pool-a'].cpu_sec_usd).toBeCloseTo(0.01);
    expect(signals['pool-a'].gb_sec_usd).toBeCloseTo(0.02);
    expect(signals['pool-a'].egress_gb_usd).toBeCloseTo(0.03);
  });

  test('skips invalid pricing numbers from env', async () => {
    process.env.PRICING_SIGNALS_JSON = JSON.stringify({
      'pool-a': {
        cpu_sec_usd: 'NaN',
        gb_sec_usd: 0.02,
        egress_gb_usd: 0.03,
      },
      'pool-b': {
        cpu_sec_usd: 0.01,
        gb_sec_usd: 0.02,
        egress_gb_usd: -1,
      },
      'pool-valid': {
        cpu_sec_usd: 0.0005,
        gb_sec_usd: 0.0004,
        egress_gb_usd: 0.05,
      },
    });

    const provider = new EnvJsonPricingSignalProvider();
    const signals = await provider.fetch();

    expect(signals).toHaveProperty('pool-valid');
    expect(signals).not.toHaveProperty('pool-a');
    expect(signals).not.toHaveProperty('pool-b');
  });

  test('falls back to baseline when env is missing', async () => {
    delete process.env.PRICING_SIGNALS_JSON;

    const provider = new EnvJsonPricingSignalProvider();
    const signals = await provider.fetch();

    expect(signals).toEqual(BASELINE_PRICING_SIGNALS);
  });
});

describe('sanitizePricingSignals', () => {
  test('filters out invalid entries and reports them', () => {
    const { signals, invalid } = sanitizePricingSignals({
      known: { cpu_sec_usd: 0.1, gb_sec_usd: 0.2, egress_gb_usd: 0.3 },
      bad: { cpu_sec_usd: Infinity, gb_sec_usd: 0.2, egress_gb_usd: 0.3 },
    });

    expect(signals).toHaveProperty('known');
    expect(signals).not.toHaveProperty('bad');
    expect(invalid).toContain('bad');
  });
});
