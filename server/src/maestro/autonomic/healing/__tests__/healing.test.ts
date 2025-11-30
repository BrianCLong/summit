
import { HealingExecutor } from '../healing-executor';
import { SelfHealingPlaybook } from '../types';
import { SignalType } from '../../signals/types';

describe('HealingExecutor', () => {
  let executor: HealingExecutor;

  beforeEach(() => {
    executor = new HealingExecutor();
  });

  it('should trigger playbook when conditions met', async () => {
    const playbook: SelfHealingPlaybook = {
      id: 'pb-retry',
      name: 'Retry High Latency',
      scope: 'TASK',
      triggers: [{ signalType: SignalType.TASK_LATENCY, operator: 'GT', value: 1000 }],
      actions: [{ type: 'RETRY', params: { backoff: 'exponential' } }],
      cooldownMs: 0
    };
    executor.registerPlaybook(playbook);

    // Spy on console to verify execution or mock runAction if we refactor to allow injection
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await executor.evaluateAndExecute([{
      type: SignalType.TASK_LATENCY,
      value: 1500,
      sourceId: 't1',
      tenantId: 'tn1',
      timestamp: new Date(),
      metadata: {},
      id: 's1'
    }]);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Healing] Executing Playbook: Retry High Latency'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Retrying task with backoff'));

    consoleSpy.mockRestore();
  });

  it('should respect cooldown', async () => {
    const playbook: SelfHealingPlaybook = {
      id: 'pb-cooldown',
      name: 'Cooldown Test',
      scope: 'TASK',
      triggers: [{ signalType: SignalType.TASK_FAILURE_COUNT, operator: 'GT', value: 0 }],
      actions: [{ type: 'ALERT', params: {} }],
      cooldownMs: 5000
    };
    executor.registerPlaybook(playbook);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const signal = {
        type: SignalType.TASK_FAILURE_COUNT,
        value: 1,
        sourceId: 't1',
        tenantId: 'tn1',
        timestamp: new Date(),
        metadata: {},
        id: 's1'
    };

    // First run
    await executor.evaluateAndExecute([signal]);
    expect(consoleSpy).toHaveBeenCalledTimes(2); // Header + Action

    consoleSpy.mockClear();

    // Immediate second run (should be ignored)
    await executor.evaluateAndExecute([signal]);
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
