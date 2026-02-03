
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { scoreEvidence } from '../../../src/connectors/evidence/score';
import { REQUIRED_FIELDS_RULE, REDACTION_MARKER_PRESENCE_RULE, SOURCE_REFERENCE_RULE } from '../../../src/connectors/evidence/rules';

describe('Evidence Scoring Engine', () => {
  it('should score a perfect evidence record correctly', () => {
    const perfectRecord = {
      id: '123',
      timestamp: new Date(),
      content: 'Some content with [REDACTED] info',
      url: 'http://example.com',
    };

    const result = scoreEvidence(perfectRecord);
    expect(result.score).toBe(1);
    expect(result.missing).toHaveLength(0);
  });

  it('should detect missing required fields', () => {
    const incompleteRecord = {
      // id missing
      timestamp: new Date(),
      content: 'Some content',
      url: 'http://example.com',
    };

    const result = scoreEvidence(incompleteRecord);
    expect(result.missing).toContain(REQUIRED_FIELDS_RULE.id);
    expect(result.score).toBeLessThan(1);
  });

  it('should detect missing redaction markers', () => {
       const unredactedRecord = {
      id: '123',
      timestamp: new Date(),
      content: 'Some raw content without protection',
      url: 'http://example.com',
    };

    const result = scoreEvidence(unredactedRecord);
    expect(result.missing).toContain(REDACTION_MARKER_PRESENCE_RULE.id);
    expect(result.score).toBeLessThan(1);
  });

    it('should detect missing source', () => {
       const noSourceRecord = {
      id: '123',
      timestamp: new Date(),
      content: 'Some content with [REDACTED]',
      // url missing
    };

    const result = scoreEvidence(noSourceRecord);
    expect(result.missing).toContain(SOURCE_REFERENCE_RULE.id);
    expect(result.score).toBeLessThan(1);
  });
});
