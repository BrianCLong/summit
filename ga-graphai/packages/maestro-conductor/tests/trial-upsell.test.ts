import { describe, it, expect, vi } from 'vitest';
import { runTrialUpsellWorkflow } from '../src/workflows/trial-upsell-dag';
import * as upsellModule from '../../../../packages/agents/src/upsell/trial-upsell';

describe('Trial Upsell Workflow', () => {
  it('should trigger upsell for high-usage tenants', async () => {
    const tenantId = 'high-usage-tenant';

    // The mock in trial-upsell.ts already returns high usage for 'high-usage' string
    const result = await runTrialUpsellWorkflow(tenantId);

    expect(result.status).toBe('upsell-triggered');
    expect(result.signal).toBeDefined();
    expect(['A', 'B']).toContain(result.signal.variant);
  });

  it('should NOT trigger upsell for low-usage tenants', async () => {
    const tenantId = 'low-usage-tenant';

    const result = await runTrialUpsellWorkflow(tenantId);

    expect(result.status).toBe('no-action');
    expect(result.signal).toBeUndefined();
  });

  it('should track conversion when triggered', async () => {
    const trackSpy = vi.spyOn(upsellModule, 'trackUpsellConversion');
    const tenantId = 'high-usage-tracker';

    await runTrialUpsellWorkflow(tenantId);

    expect(trackSpy).toHaveBeenCalledWith(
      tenantId,
      expect.stringMatching(/A|B/),
      'nudge_shown'
    );
  });

  it('should respect opt-out', async () => {
    const tenantId = 'high-usage-opt-out';
    upsellModule.optOutTenant(tenantId);

    const result = await runTrialUpsellWorkflow(tenantId);

    expect(result.status).toBe('no-action');
  });

  it('should respect frequency cap', async () => {
    const tenantId = 'high-usage-freq-cap';

    // First run triggers it
    const firstResult = await runTrialUpsellWorkflow(tenantId);
    expect(firstResult.status).toBe('upsell-triggered');

    // Second run immediately after should skip
    const secondResult = await runTrialUpsellWorkflow(tenantId);
    expect(secondResult.status).toBe('no-action');
  });

  it('simulation: 20% conversion rate mock', () => {
    const trials = 100;
    let conversions = 0;
    const conversionRate = 0.2;

    for (let i = 0; i < trials; i++) {
      if (Math.random() < conversionRate) {
        conversions++;
      }
    }

    console.log(`[Sim] Total trials: ${trials}, Conversions: ${conversions} (${(conversions/trials)*100}%)`);
    // Just a simulation log as requested
    expect(conversions).toBeGreaterThanOrEqual(0);
  });
});
