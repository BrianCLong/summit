import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDiffPolicy } from '../train_diff_policy.mjs';

describe('Release Train diff policy', () => {
  test('allows changes when no forbidden paths touched', () => {
    const result = evaluateDiffPolicy(['README.md'], {
      forbidden_paths: ['release/TRAIN_POLICY.yml'],
    });

    assert.equal(result.allowed, true);
    assert.deepEqual(result.violations, []);
  });

  test('blocks changes when forbidden paths touched', () => {
    const result = evaluateDiffPolicy(['release/TRAIN_POLICY.yml'], {
      forbidden_paths: ['release/TRAIN_POLICY.yml'],
    });

    assert.equal(result.allowed, false);
    assert.deepEqual(result.violations, ['release/TRAIN_POLICY.yml']);
  });
});
