
import { SLOPolicyEngine } from '../slo-policy-engine';
import { SignalsService } from '../../signals/signals-service';
import { SignalType } from '../../signals/types';
import { SLAContract, SLOAlertLevel } from '../types';

describe('SLOPolicyEngine', () => {
  let signalsService: SignalsService;
  let engine: SLOPolicyEngine;

  beforeEach(() => {
    signalsService = new SignalsService();
    engine = new SLOPolicyEngine(signalsService);
  });

  it('should detect SLO breach and burn budget', () => {
    const sloId = 'slo-latency-1';
    const contract: SLAContract = {
      id: 'contract-1',
      tenantId: 'tenant-1',
      tiers: 'SILVER',
      slos: [
        {
          id: sloId,
          name: 'Latency < 500ms',
          targetType: SignalType.TASK_LATENCY,
          targetValue: 500,
          comparator: '<',
          window: '5m',
          errorBudgetStartingPoints: 10,
          burnRatePerViolation: 5
        }
      ]
    };

    engine.registerContract(contract);

    // Inject failing signal
    signalsService.ingestSignal({
      type: SignalType.TASK_LATENCY,
      value: 600, // Violation
      sourceId: 'system-core',
      tenantId: 'tenant-1',
      metadata: { scope: 'SYSTEM' }
    });

    const alerts = engine.evaluate('tenant-1');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe(SLOAlertLevel.BREACH);

    const budget = engine.getBudgetStatus(sloId);
    expect(budget?.remainingPoints).toBe(5);
  });

  it('should trigger exhaust alert when budget is gone', () => {
    const sloId = 'slo-fail-1';
    const contract: SLAContract = {
      id: 'contract-2',
      tenantId: 'tenant-2',
      tiers: 'GOLD',
      slos: [
        {
          id: sloId,
          name: 'Zero Failures',
          targetType: SignalType.TASK_FAILURE_COUNT,
          targetValue: 0,
          comparator: '<=',
          window: '5m',
          errorBudgetStartingPoints: 5,
          burnRatePerViolation: 10 // Instant exhaust
        }
      ]
    };
    engine.registerContract(contract);

    signalsService.ingestSignal({
      type: SignalType.TASK_FAILURE_COUNT,
      value: 1,
      sourceId: 'system-core',
      tenantId: 'tenant-2',
      metadata: { scope: 'SYSTEM' }
    });

    const alerts = engine.evaluate('tenant-2');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe(SLOAlertLevel.BUDGET_EXHAUSTED);
    expect(engine.getBudgetStatus(sloId)?.status).toBe('EXHAUSTED');
  });
});
