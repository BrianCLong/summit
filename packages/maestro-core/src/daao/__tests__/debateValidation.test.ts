import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DebateValidator, LLMRunner } from '../collaboration/debateValidation';

describe('DebateValidator', () => {
  let validator: DebateValidator;
  let mockRunner: jest.Mocked<LLMRunner>;

  beforeEach(() => {
    mockRunner = {
      run: jest.fn()
    } as any;
    validator = new DebateValidator(mockRunner);
  });

  it('should refine if score is low', async () => {
    mockRunner.run
      .mockResolvedValueOnce(JSON.stringify({
        score: 0.5,
        strengths: [],
        weaknesses: ['Bad'],
        recommendations: 'Fix it'
      })) // Critic
      .mockResolvedValueOnce('Refined Solution'); // Refiner

    const result = await validator.validateAndRefine('Bad Solution');

    expect(result.wasRefined).toBe(true);
    expect(result.refined).toBe('Refined Solution');
    expect(mockRunner.run).toHaveBeenCalledTimes(2);
  });

  it('should skip refinement if score is high', async () => {
    mockRunner.run
      .mockResolvedValueOnce(JSON.stringify({
        score: 0.98,
        strengths: ['Great'],
        weaknesses: [],
        recommendations: 'None'
      })); // Critic

    const result = await validator.validateAndRefine('Good Solution');

    expect(result.wasRefined).toBe(false);
    expect(result.refined).toBe('Good Solution');
    expect(mockRunner.run).toHaveBeenCalledTimes(1);
  });

  it('should handle malformed JSON from critic', async () => {
    mockRunner.run
        .mockResolvedValueOnce('This is not JSON but a critique.') // Critic
        .mockResolvedValueOnce('Refined anyway'); // Refiner

    const result = await validator.validateAndRefine('Solution');

    expect(result.wasRefined).toBe(true);
    expect(result.critiqueParsed).toBeUndefined();
    expect(result.refined).toBe('Refined anyway');
  });
});
