import { describe, it, expect } from 'vitest';
import { CibScreeningService } from '../src/index.js';

describe('CibScreeningService', () => {
  it('should return low risk for empty input', async () => {
    const service = new CibScreeningService();
    const result = await service.screenGraph([]);
    expect(result.score).toBe(0);
  });

  it('should detect suspicious entities (stub)', async () => {
    const service = new CibScreeningService();
    const entities = [{ id: "user_bot_1", type: "account", metadata: {} }];
    const result = await service.screenGraph(entities);
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.reasons).toContain("Detected suspicious entity pattern");
  });
});
