import { test, describe } from 'node:test';
import assert from 'node:assert';
import { extractCheckNames, expandMatrix } from '../validate_policy_references.mjs';

describe('Adversarial Policy Reference Validation', () => {
  describe('3A) Matrix Expansion Accuracy', () => {
    test('handles include/exclude', () => {
      const matrix = {
        node: [18, 20],
        exclude: [{ node: 18 }],
        include: [{ node: 22 }]
      };
      const result = expandMatrix(matrix);
      assert.strictEqual(result.length, 2);
      assert.ok(result.some(r => r.node === 20));
      assert.ok(result.some(r => r.node === 22));
    });

    test('resolves variables in names', () => {
      const workflow = {
        name: 'CI',
        jobs: {
          test: {
            name: 'Node ${{ matrix.node }}',
            strategy: { matrix: { node: [18] } }
          }
        }
      };
      const names = extractCheckNames(workflow, 'test.yml');
      assert.ok(names.has('Node 18'));
      assert.ok(names.has('CI / Node 18'));
    });
  });
});
