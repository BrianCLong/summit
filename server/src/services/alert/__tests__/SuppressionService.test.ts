import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { SuppressionService } from '../SuppressionService.js';
import { SuppressionRule } from '../../../types/alerts.js';

describe('SuppressionService', () => {
  let suppressionService: SuppressionService;

  beforeEach(() => {
    suppressionService = new SuppressionService();
  });

  it('should suppress alerts within the window', () => {
    const rule: SuppressionRule = {
      id: 's1',
      startTime: 1000,
      endTime: 2000,
      reason: 'test',
      createdBy: 'user',
    };
    suppressionService.addRule(rule);

    expect(suppressionService.isSuppressed('r1', 'e1', 1500)).toBe(true);
    expect(suppressionService.isSuppressed('r1', 'e1', 900)).toBe(false);
    expect(suppressionService.isSuppressed('r1', 'e1', 2100)).toBe(false);
  });

  it('should suppress based on ruleId', () => {
    const rule: SuppressionRule = {
      id: 's1',
      targetRuleId: 'target-rule',
      startTime: 1000,
      endTime: 2000,
      reason: 'test',
      createdBy: 'user',
    };
    suppressionService.addRule(rule);

    expect(suppressionService.isSuppressed('target-rule', 'e1', 1500)).toBe(true);
    expect(suppressionService.isSuppressed('other-rule', 'e1', 1500)).toBe(false);
  });

  it('should suppress based on entityKey', () => {
    const rule: SuppressionRule = {
      id: 's1',
      targetEntityKey: 'target-entity',
      startTime: 1000,
      endTime: 2000,
      reason: 'test',
      createdBy: 'user',
    };
    suppressionService.addRule(rule);

    expect(suppressionService.isSuppressed('r1', 'target-entity', 1500)).toBe(true);
    expect(suppressionService.isSuppressed('r1', 'other-entity', 1500)).toBe(false);
  });
});
