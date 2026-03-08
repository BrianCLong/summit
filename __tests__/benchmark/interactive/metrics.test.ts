import test from 'node:test';
import assert from 'node:assert';
import { scoreInformationGain } from '../../../benchmarks/interactive/scoring/information_gain';
import { scoreBudgetEfficiency } from '../../../benchmarks/interactive/scoring/budget_efficiency';
import { TraceEvent } from '../../../benchmarks/interactive/runners/interactive_runner';

const mockTraces: TraceEvent[] = [
  { step: 1, timestamp: '1', action: { type: 'a' }, observation: { state: 's1' }, reward: 1, budget: { steps_remaining: 9, wallclock_remaining_ms: 100 } },
  { step: 2, timestamp: '2', action: { type: 'a' }, observation: { state: 's2' }, reward: 1, budget: { steps_remaining: 8, wallclock_remaining_ms: 90 } },
  { step: 3, timestamp: '3', action: { type: 'b' }, observation: { state: 's3', done: true }, reward: 5, budget: { steps_remaining: 7, wallclock_remaining_ms: 80 } }
];

test('scoreInformationGain calculates correctly', () => {
  const score = scoreInformationGain(mockTraces);

  // 3 unique states over 3 traces -> exploration score = 1.0
  // total reward = 7 over 3 traces -> reward score = 2.333
  // info gain = (1.0 * 0.6) + (2.333 * 0.4) = 0.6 + 0.933 = 1.533
  assert.ok(score > 1.5 && score < 1.6);
});

test('scoreBudgetEfficiency calculates correctly', () => {
  const maxSteps = 10;
  const score = scoreBudgetEfficiency(mockTraces, maxSteps);

  // 3 steps taken out of 10 -> efficiency = 0.7
  // last trace done=true -> multiplier = 1.5
  // score = 0.7 * 1.5 = 1.05
  // using approximately equal due to floating point math
  assert.ok(Math.abs(score - 1.05) < 0.001);
});
