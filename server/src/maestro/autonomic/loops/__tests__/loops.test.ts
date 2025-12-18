
import { ReliabilityLoop } from '../reliability-loop';
import { CostOptimizationLoop } from '../cost-loop';
import { SignalsService } from '../../signals/signals-service';
import { SLOPolicyEngine } from '../../policy/slo-policy-engine';
import { SignalType, HealthStatus } from '../../signals/types';
import { SLOAlertLevel } from '../../policy/types';

describe('ReliabilityLoop', () => {
  let loop: ReliabilityLoop;

  beforeEach(() => {
    loop = new ReliabilityLoop();
  });

  it('should plan throttling when budget is exhausted', async () => {
    const health = { system: { status: HealthStatus.HEALTHY } } as any;
    const alerts = [{ id: '1', sloId: 's1', level: SLOAlertLevel.BUDGET_EXHAUSTED, message: 'Exhausted', timestamp: new Date(), metadata: {} }];

    await loop.monitor(health, alerts);
    const needAdaptation = await loop.analyze();
    expect(needAdaptation).toBe(true);

    const plan = await loop.plan();
    expect(plan).not.toBeNull();
    expect(plan?.actions[0].type).toBe('THROTTLE_QUEUE');
  });

  it('should plan degraded mode when system is critical', async () => {
    const health = { system: { status: HealthStatus.CRITICAL, metrics: {}, issues: [], lastUpdated: new Date() } } as any;
    const alerts: any[] = [];

    await loop.monitor(health, alerts);
    const needAdaptation = await loop.analyze();
    expect(needAdaptation).toBe(true);

    const plan = await loop.plan();
    expect(plan?.actions[0].type).toBe('ENABLE_DEGRADED_MODE');
  });
});

describe('CostOptimizationLoop', () => {
  let loop: CostOptimizationLoop;

  beforeEach(() => {
    loop = new CostOptimizationLoop();
  });

  it('should switch models when over budget', async () => {
    const health = {
      system: {
        metrics: { 'cost_spend_24h': 95 }, // 95 > 90
        status: HealthStatus.HEALTHY
      }
    } as any;

    await loop.monitor(health, []);
    const needAdaptation = await loop.analyze();
    expect(needAdaptation).toBe(true);

    const plan = await loop.plan();
    expect(plan?.actions[0].type).toBe('SWITCH_MODEL_PROVIDER');
  });
});
