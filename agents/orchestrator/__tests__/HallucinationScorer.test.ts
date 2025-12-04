/**
 * Hallucination Scorer Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HallucinationScorer } from '../src/scoring/HallucinationScorer.js';
import { ChainContext, LLMResponse } from '../src/types/index.js';

describe('HallucinationScorer', () => {
  let scorer: HallucinationScorer;
  let mockContext: ChainContext;

  beforeEach(() => {
    scorer = new HallucinationScorer({ enabled: true });
    mockContext = {
      chainId: 'test-chain',
      stepId: 'test-step',
      sessionId: 'test-session',
      userId: 'test-user',
      startTime: new Date(),
      variables: {},
      history: [],
      metadata: {},
    };
  });

  const createResponse = (content: string): LLMResponse => ({
    id: 'test-response',
    model: 'claude-3-5-sonnet-20241022',
    provider: 'claude',
    content,
    usage: {
      promptTokens: 100,
      completionTokens: 200,
      totalTokens: 300,
      estimatedCostUSD: 0.01,
    },
    latencyMs: 500,
    cached: false,
  });

  describe('basic scoring', () => {
    it('should return a score between 0 and 1', async () => {
      const response = createResponse('This is a simple response about programming.');
      const score = await scorer.score(response, mockContext, 'Tell me about programming');

      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(1);
    });

    it('should include confidence score', async () => {
      const response = createResponse('This is a response.');
      const score = await scorer.score(response, mockContext, 'Test prompt');

      expect(score.confidence).toBeGreaterThanOrEqual(0);
      expect(score.confidence).toBeLessThanOrEqual(1);
    });

    it('should include factors', async () => {
      const response = createResponse('This is a response about the topic.');
      const score = await scorer.score(response, mockContext, 'Tell me about the topic');

      expect(score.factors.length).toBeGreaterThan(0);
      expect(score.factors.every((f) => f.score >= 0 && f.score <= 1)).toBe(true);
    });
  });

  describe('consistency evaluation', () => {
    it('should score higher for relevant responses', async () => {
      const prompt = 'Explain how JavaScript closures work';
      const relevantResponse = createResponse(
        'JavaScript closures are functions that have access to variables from their outer scope. ' +
        'When a function is defined inside another function, it creates a closure.',
      );
      const irrelevantResponse = createResponse(
        'The weather today is sunny with a high of 75 degrees.',
      );

      const relevantScore = await scorer.score(relevantResponse, mockContext, prompt);
      const irrelevantScore = await scorer.score(irrelevantResponse, mockContext, prompt);

      expect(relevantScore.overall).toBeGreaterThan(irrelevantScore.overall);
    });
  });

  describe('confidence markers', () => {
    it('should detect overconfidence markers', async () => {
      const overconfidentResponse = createResponse(
        'I am absolutely certain that this is 100% true without a doubt. ' +
        'Everyone knows this is definitely the case.',
      );
      const balancedResponse = createResponse(
        'Based on my understanding, this appears to be the case. ' +
        'However, I believe there may be some nuances to consider.',
      );

      const overconfidentScore = await scorer.score(overconfidentResponse, mockContext, 'Is this true?');
      const balancedScore = await scorer.score(balancedResponse, mockContext, 'Is this true?');

      const overconfidentFactor = overconfidentScore.factors.find((f) => f.name === 'confidence-markers');
      const balancedFactor = balancedScore.factors.find((f) => f.name === 'confidence-markers');

      expect(overconfidentFactor?.score).toBeLessThan(balancedFactor?.score ?? 1);
    });
  });

  describe('self-contradiction detection', () => {
    it('should detect contradictory statements', async () => {
      const contradictoryResponse = createResponse(
        'The system always works correctly. ' +
        'However, the system never works correctly when under load.',
      );
      const consistentResponse = createResponse(
        'The system generally works correctly under normal conditions. ' +
        'Performance may vary under heavy load.',
      );

      const contradictoryScore = await scorer.score(contradictoryResponse, mockContext, 'How does the system work?');
      const consistentScore = await scorer.score(consistentResponse, mockContext, 'How does the system work?');

      const contradictoryFactor = contradictoryScore.factors.find((f) => f.name === 'self-contradiction');
      const consistentFactor = consistentScore.factors.find((f) => f.name === 'self-contradiction');

      expect(contradictoryFactor?.score).toBeLessThanOrEqual(consistentFactor?.score ?? 1);
    });
  });

  describe('claims density', () => {
    it('should track claims density', async () => {
      const highClaimsDensity = createResponse(
        'In 2024, there were exactly 1,234 incidents. ' +
        'The rate increased by 45.7% from 2023. ' +
        'Specifically, 567 occurred in Q1, 234 in Q2, 433 in Q3.',
      );

      const score = await scorer.score(highClaimsDensity, mockContext, 'What happened?');
      const claimsFactor = score.factors.find((f) => f.name === 'claims-density');

      expect(claimsFactor).toBeDefined();
      expect(claimsFactor?.details).toContain('Numeric claims');
    });
  });

  describe('consensus scoring', () => {
    it('should score higher when responses agree', async () => {
      const responses = [
        createResponse('Python is a programming language used for web development and data science.'),
        createResponse('Python is a popular programming language for web development and data analysis.'),
        createResponse('Python is commonly used in web development and data science applications.'),
      ];

      const consensusScore = await scorer.scoreConsensus(responses, mockContext, 'What is Python?');

      expect(consensusScore.overall).toBeGreaterThan(0.5);
      expect(consensusScore.factors.some((f) => f.name === 'model-agreement')).toBe(true);
    });

    it('should score lower when responses disagree', async () => {
      const responses = [
        createResponse('The answer is definitely 42.'),
        createResponse('The answer is clearly 100.'),
        createResponse('The answer should be around 7.'),
      ];

      const consensusScore = await scorer.scoreConsensus(responses, mockContext, 'What is the answer?');

      const agreementFactor = consensusScore.factors.find((f) => f.name === 'model-agreement');
      expect(agreementFactor?.score).toBeLessThan(0.8);
    });

    it('should handle single response', async () => {
      const responses = [
        createResponse('This is the only response.'),
      ];

      const score = await scorer.scoreConsensus(responses, mockContext, 'Test prompt');
      expect(score.overall).toBeGreaterThanOrEqual(0);
    });
  });

  describe('recommendations', () => {
    it('should provide recommendations for low scores', async () => {
      const suspiciousResponse = createResponse(
        'I am absolutely 100% certain that in exactly 1847, precisely 42,567 events occurred. ' +
        'This is definitely true. Everyone knows this fact is absolutely correct.',
      );

      const score = await scorer.score(suspiciousResponse, mockContext, 'Tell me something');

      // Low confidence responses should generate recommendations
      if (score.overall < 0.7) {
        expect(score.recommendations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('disabled scoring', () => {
    it('should return passing score when disabled', async () => {
      const disabledScorer = new HallucinationScorer({ enabled: false });
      const response = createResponse('Any content here');

      const score = await disabledScorer.score(response, mockContext, 'Any prompt');

      expect(score.overall).toBe(1);
      expect(score.confidence).toBe(1);
      expect(score.factors).toHaveLength(0);
    });
  });
});
