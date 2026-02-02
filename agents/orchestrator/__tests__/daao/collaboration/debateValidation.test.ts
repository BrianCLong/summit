import { describe, it, expect, vi } from 'vitest';
import { DebateValidator, LLMRunner } from '../../../src/daao/collaboration/debateValidation.js';

describe('DebateValidator', () => {
  it('should refine draft if critique score is low', async () => {
    const mockRunner: LLMRunner = {
      run: vi.fn()
        .mockResolvedValueOnce(JSON.stringify({
          issues: ['Too brief'],
          score: 0.5,
          safe: true
        })) // Critique
        .mockResolvedValueOnce("Refined Answer") // Refinement
    };

    const validator = new DebateValidator(mockRunner);
    const result = await validator.validate("Draft");

    expect(result.improved).toBe(true);
    expect(result.refined).toBe("Refined Answer");
    expect(mockRunner.run).toHaveBeenCalledTimes(2);
  });

  it('should not refine if critique score is high', async () => {
    const mockRunner: LLMRunner = {
      run: vi.fn()
        .mockResolvedValueOnce(JSON.stringify({
          issues: [],
          score: 0.95,
          safe: true
        }))
    };

    const validator = new DebateValidator(mockRunner);
    const result = await validator.validate("Perfect Draft");

    expect(result.improved).toBe(false);
    expect(result.refined).toBe("Perfect Draft");
    expect(mockRunner.run).toHaveBeenCalledTimes(1);
  });

  it('should handle malformed JSON critique gracefully and still refine', async () => {
    const mockRunner: LLMRunner = {
      run: vi.fn()
        .mockResolvedValueOnce("Not JSON") // Critique
        .mockResolvedValueOnce("Refined Answer") // Refinement
    };

    const validator = new DebateValidator(mockRunner);
    const result = await validator.validate("Draft");

    expect(result.parsedCritique).toBeUndefined();
    expect(result.improved).toBe(true); // Should refine because it couldn't verify quality
    expect(result.refined).toBe("Refined Answer");
  });

  it('should extract JSON from mixed content', async () => {
    const jsonBlock = JSON.stringify({ score: 0.5, safe: true });
    const mockRunner: LLMRunner = {
      run: vi.fn()
        .mockResolvedValueOnce(`Here is the critique: ${jsonBlock} thanks.`) // Critique
        .mockResolvedValueOnce("Refined")
    };

    const validator = new DebateValidator(mockRunner);
    const result = await validator.validate("Draft");

    expect(result.parsedCritique).toBeDefined();
    expect(result.parsedCritique?.score).toBe(0.5);
  });
});
