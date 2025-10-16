import {
  runRedBlueSimulation,
  RedAction,
  BlueControl,
} from '../src/ai/red-blue-simulation';

describe('runRedBlueSimulation', () => {
  test('detects attack when control covers tactic', () => {
    const actions: RedAction[] = [
      { id: 'a1', tactic: 'initial-access', timestamp: 0, success: true },
      { id: 'a2', tactic: 'execution', timestamp: 10, success: true },
    ];
    const controls: BlueControl[] = [
      { id: 'c1', name: 'edr', detects: ['execution'], effectiveness: 1 },
    ];

    const result = runRedBlueSimulation(actions, controls);
    expect(result.timeToDetect).toBe(10);
    expect(result.lateralSpread).toBe(1);
    expect(result.containmentTime).toBe(11);
  });
});
