import test from 'node:test';
import assert from 'node:assert';
import { formatOutput } from '../../scripts/repoos/format-entropy-output.mjs';

test('formatOutput - STABLE signal', (t) => {
  const data = {
    current_entropy: 4.1234,
    drift_analysis: {
      drift: 0.02,
      signal: 'STABLE'
    },
    interventions: []
  };

  const result = formatOutput(data);

  assert.strictEqual(result.jsonOutput.entropy_score, 4.1234);
  assert.strictEqual(result.jsonOutput.threshold, 0.05);
  assert.strictEqual(result.jsonOutput.verdict, 'PASS');
  assert.deepStrictEqual(result.jsonOutput.top_signals, ['Entropy drift: +0.020']);
  assert.strictEqual(result.jsonOutput.recommended_action, 'Continue normal operations.');
  assert.strictEqual(result.summaryLine, '[ENTROPY] PASS - Score: 4.123 | Drift: +0.020 | Trend: STABLE');
});

test('formatOutput - WARNING signal', (t) => {
  const data = {
    current_entropy: 4.5678,
    drift_analysis: {
      drift: 0.12,
      signal: 'WARNING'
    },
    interventions: [
      {
        action: 'activate_patch_surface_limiting',
        priority: 'medium',
        description: 'Activate Patch Surface Limiting to reduce router ambiguity'
      }
    ]
  };

  const result = formatOutput(data);

  assert.strictEqual(result.jsonOutput.entropy_score, 4.5678);
  assert.strictEqual(result.jsonOutput.threshold, 0.10);
  assert.strictEqual(result.jsonOutput.verdict, 'WARN');
  assert.deepStrictEqual(result.jsonOutput.top_signals, [
    'Entropy drift: +0.120',
    '[MEDIUM] activate_patch_surface_limiting: Activate Patch Surface Limiting to reduce router ambiguity'
  ]);
  assert.strictEqual(result.jsonOutput.recommended_action, 'ACTIVATE_PATCH_SURFACE_LIMITING');
  assert.strictEqual(result.summaryLine, '[ENTROPY] WARN - Score: 4.568 | Drift: +0.120 | Trend: WARNING');
});

test('formatOutput - DANGER signal', (t) => {
  const data = {
    current_entropy: 5.0,
    drift_analysis: {
      drift: 0.25,
      signal: 'DANGER'
    },
    interventions: [
      {
        action: 'reduce_agent_budget',
        priority: 'high',
        description: 'Reduce agent budget by 30% to slow patch generation'
      },
      {
        action: 'increase_patch_surface_limits',
        priority: 'high',
        description: 'Tighten patch surface constraints to improve routing'
      }
    ]
  };

  const result = formatOutput(data);

  assert.strictEqual(result.jsonOutput.entropy_score, 5.0);
  assert.strictEqual(result.jsonOutput.threshold, 0.15);
  assert.strictEqual(result.jsonOutput.verdict, 'FAIL');
  assert.strictEqual(result.jsonOutput.top_signals.length, 3);
  assert.strictEqual(result.jsonOutput.top_signals[0], 'Entropy drift: +0.250');
  assert.strictEqual(result.jsonOutput.top_signals[1], '[HIGH] reduce_agent_budget: Reduce agent budget by 30% to slow patch generation');
  assert.strictEqual(result.jsonOutput.recommended_action, 'REDUCE_AGENT_BUDGET');
  assert.strictEqual(result.summaryLine, '[ENTROPY] FAIL - Score: 5.000 | Drift: +0.250 | Trend: DANGER');
});

test('formatOutput - INSUFFICIENT_DATA signal', (t) => {
  const data = {
    current_entropy: 3.5,
    drift_analysis: {
      drift: 0,
      signal: 'INSUFFICIENT_DATA'
    },
    interventions: []
  };

  const result = formatOutput(data);

  assert.strictEqual(result.jsonOutput.entropy_score, 3.5);
  assert.strictEqual(result.jsonOutput.verdict, 'PASS');
  assert.deepStrictEqual(result.jsonOutput.top_signals, ['Insufficient data for drift analysis.']);
  assert.strictEqual(result.jsonOutput.recommended_action, 'None');
  assert.strictEqual(result.summaryLine, '[ENTROPY] PASS - Score: 3.500 | Drift: +0.000 | Trend: INSUFFICIENT_DATA');
});

test('formatOutput - missing data', (t) => {
  const data = {};

  const result = formatOutput(data);

  assert.strictEqual(result.jsonOutput.entropy_score, 0);
  assert.strictEqual(result.jsonOutput.threshold, 0.05);
  assert.strictEqual(result.jsonOutput.verdict, 'PASS');
  assert.deepStrictEqual(result.jsonOutput.top_signals, ['Entropy drift: +0.000']);
  assert.strictEqual(result.jsonOutput.recommended_action, 'None');
  assert.strictEqual(result.summaryLine, '[ENTROPY] PASS - Score: 0.000 | Drift: +0.000 | Trend: UNKNOWN');
});
