import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { generateLeaderboard } from '../../evaluation/leaderboard/aggregation';

describe('Leaderboard Aggregation', () => {
  test('should aggregate results into a leaderboard format', () => {
    const mockResults = [
      {
        model: 'model-a',
        version: '1.0',
        benchmarkVersion: '1.0.0',
        report: {
          aggregateScore: 95,
          evidenceScores: [
            { precision: 1.0, recall: 0.9, coverage: 0.9, f1_score: 0.95 },
            { precision: 0.9, recall: 0.8, coverage: 0.8, f1_score: 0.85 }
          ]
        },
        metrics: {
          latencyAvg: 150,
          costTotal: 0.05
        }
      },
      {
        model: 'model-b',
        version: '2.0',
        benchmarkVersion: '1.0.0',
        report: {
          aggregateScore: 85,
          evidenceScores: [
            { precision: 0.8, recall: 0.7, coverage: 0.7, f1_score: 0.75 }
          ]
        },
        metrics: {
          latencyAvg: 200,
          costTotal: 0.03
        }
      }
    ];

    const leaderboard = generateLeaderboard(mockResults);

    assert.ok(leaderboard.timestamp);
    assert.strictEqual(leaderboard.benchmarkVersion, '1.0.0');
    assert.strictEqual(leaderboard.entries.length, 2);

    // Should be sorted by aggregateScore descending
    assert.strictEqual(leaderboard.entries[0].model, 'model-a');
    assert.strictEqual(leaderboard.entries[0].aggregateScore, 95);
    assert.strictEqual(leaderboard.entries[0].evidencePrecision, 0.95); // (1.0 + 0.9) / 2

    assert.strictEqual(leaderboard.entries[1].model, 'model-b');
    assert.strictEqual(leaderboard.entries[1].aggregateScore, 85);
  });

  test('should handle empty results gracefully', () => {
    const leaderboard = generateLeaderboard([]);
    assert.strictEqual(leaderboard.entries.length, 0);
  });
});
