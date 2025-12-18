
import { AutonomicLayer } from '../index';
import { SignalType } from '../signals/types';
import { SLOAlertLevel } from '../policy/types';

describe('AutonomicLayer Integration', () => {
  let layer: AutonomicLayer;

  beforeEach(() => {
    layer = new AutonomicLayer();
    jest.useFakeTimers();
  });

  afterEach(() => {
    layer.stop();
    jest.useRealTimers();
  });

  it('should run control loops and execute governed plans', async () => {
    // 1. Setup: Register a contract
    layer.policy.registerContract({
      id: 'c1',
      tenantId: 'system',
      tiers: 'GOLD',
      slos: [{
        id: 'slo-1',
        name: 'No Errors',
        targetType: SignalType.TASK_FAILURE_COUNT,
        targetValue: 0,
        comparator: '<=',
        window: '5m',
        errorBudgetStartingPoints: 0, // Fail immediately
        burnRatePerViolation: 1
      }]
    });

    // 2. Inject Failure Signal
    layer.signals.ingestSignal({
      type: SignalType.TASK_FAILURE_COUNT,
      value: 1,
      sourceId: 'system-core',
      tenantId: 'system',
      metadata: { scope: 'SYSTEM' }
    });

    // 3. Spy on execute of ReliabilityLoop (which is the first loop usually)
    // Hard to spy on internal array, so we spy on console for this integration test
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    // 4. Run Loop
    await layer.runControlLoops();

    // 5. Verify
    // ReliabilityLoop should see BUDGET_EXHAUSTED -> Plan THROTTLE_QUEUE
    // Governance should see THROTTLE_QUEUE -> APPROVED
    // Loop should execute -> Console log
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[ReliabilityLoop] Executing plan'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('THROTTLE_QUEUE'));

    logSpy.mockRestore();
  });
});
