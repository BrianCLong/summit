import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyScore,
  getRecommendedAction,
  calculateNextReviewDate,
  formatOperatorJson,
  formatOperatorMarkdown
} from '../../../services/repoos/patch-market-formatter.mjs';

describe('Patch Market Formatter', () => {
  describe('classifyScore', () => {
    it('should classify >= 0.75 as critical', () => {
      assert.equal(classifyScore(0.75), 'critical');
      assert.equal(classifyScore(0.9), 'critical');
    });

    it('should classify >= 0.6 and < 0.75 as high', () => {
      assert.equal(classifyScore(0.6), 'high');
      assert.equal(classifyScore(0.74), 'high');
    });

    it('should classify >= 0.45 and < 0.6 as medium', () => {
      assert.equal(classifyScore(0.45), 'medium');
      assert.equal(classifyScore(0.59), 'medium');
    });

    it('should classify < 0.45 as low', () => {
      assert.equal(classifyScore(0.44), 'low');
      assert.equal(classifyScore(0.1), 'low');
    });
  });

  describe('getRecommendedAction', () => {
    it('should return merge_immediately for critical', () => {
      assert.equal(getRecommendedAction('critical'), 'merge_immediately');
    });

    it('should return queue_next_cycle for high', () => {
      assert.equal(getRecommendedAction('high'), 'queue_next_cycle');
    });

    it('should return standard_review for medium', () => {
      assert.equal(getRecommendedAction('medium'), 'standard_review');
    });

    it('should return defer_or_reject for low', () => {
      assert.equal(getRecommendedAction('low'), 'defer_or_reject');
    });
  });

  describe('calculateNextReviewDate', () => {
    const baseDate = '2023-10-01T12:00:00Z';

    it('should add 1 day for critical', () => {
      assert.equal(calculateNextReviewDate('critical', baseDate), '2023-10-02');
    });

    it('should add 2 days for high', () => {
      assert.equal(calculateNextReviewDate('high', baseDate), '2023-10-03');
    });

    it('should add 7 days for medium', () => {
      assert.equal(calculateNextReviewDate('medium', baseDate), '2023-10-08');
    });

    it('should add 30 days for low', () => {
      assert.equal(calculateNextReviewDate('low', baseDate), '2023-10-31');
    });
  });

  describe('formatOperatorJson', () => {
    it('should format a valid queue item correctly', () => {
      const input = {
        timestamp: '2023-10-01T12:00:00Z',
        queue: [
          {
            number: 123,
            priority: 0.8,
            scores: {
              architectural_impact: 0.9,
              risk_penalty: 0.1
            }
          }
        ]
      };

      const output = formatOperatorJson(input);

      assert.equal(output.timestamp, '2023-10-01T12:00:00Z');
      assert.equal(output.total_recommendations, 1);

      const rec = output.recommendations[0];
      assert.equal(rec.patch_id, 'PR-123');
      assert.equal(rec.priority_score, 0.8);
      assert.equal(rec.classification, 'critical');
      assert.equal(rec.recommended_action, 'merge_immediately');
      assert.equal(rec.next_review_date, '2023-10-02');
      assert.ok(rec.evidence_refs.includes('pr:123'));
      assert.ok(rec.evidence_refs.includes('score:architectural_impact=0.90'));
      assert.ok(rec.evidence_refs.includes('score:risk_penalty=0.10'));
    });

    it('should handle missing fields gracefully', () => {
      const input = { queue: [{}] };
      const output = formatOperatorJson(input, '2023-10-01T12:00:00Z');

      const rec = output.recommendations[0];
      assert.equal(rec.patch_id, 'UNKNOWN');
      assert.equal(rec.priority_score, 0);
      assert.equal(rec.classification, 'low');
    });
  });

  describe('formatOperatorMarkdown', () => {
    it('should generate valid markdown', () => {
      const input = {
        timestamp: '2023-10-01T12:00:00Z',
        recommendations: [
          {
            patch_id: 'PR-123',
            priority_score: 0.8,
            classification: 'critical',
            recommended_action: 'merge_immediately',
            next_review_date: '2023-10-02',
            evidence_refs: ['pr:123', 'score:impact=0.90']
          }
        ]
      };

      const md = formatOperatorMarkdown(input);

      assert.ok(md.includes('# Patch Market Prioritization Report'));
      assert.ok(md.includes('2023-10-01T12:00:00Z'));
      assert.ok(md.includes('| PR-123 | 0.80 | **CRITICAL** | `merge_immediately` | 2023-10-02 | pr:123<br>score:impact=0.90 |'));
    });
  });
});
