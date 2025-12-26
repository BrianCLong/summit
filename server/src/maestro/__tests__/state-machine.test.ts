import { RunStateMachine } from '../state-machine.js';
import { RunStatus } from '../types.js';

describe('RunStateMachine', () => {
  test('allows valid transitions', () => {
    expect(RunStateMachine.canTransition('created', 'running')).toBe(true);
    expect(RunStateMachine.canTransition('running', 'completed')).toBe(true);
    expect(RunStateMachine.canTransition('running', 'failed')).toBe(true);
    expect(RunStateMachine.canTransition('running', 'paused')).toBe(true);
    expect(RunStateMachine.canTransition('paused', 'running')).toBe(true);
  });

  test('blocks invalid transitions', () => {
    expect(RunStateMachine.canTransition('created', 'completed')).toBe(false); // Must run first
    expect(RunStateMachine.canTransition('completed', 'running')).toBe(false); // Terminal
    expect(RunStateMachine.canTransition('failed', 'running')).toBe(false); // Terminal
    expect(RunStateMachine.canTransition('aborted', 'completed')).toBe(false); // Terminal
  });

  test('validateTransition throws error on invalid transition', () => {
    expect(() => {
      RunStateMachine.validateTransition('created', 'completed' as RunStatus);
    }).toThrow('Invalid state transition: created -> completed');
  });

  test('getNextStates returns correct options', () => {
    const createdNext = RunStateMachine.getNextStates('created');
    expect(createdNext).toContain('running');
    expect(createdNext).toContain('aborted');
    expect(createdNext).not.toContain('completed');
  });
});
