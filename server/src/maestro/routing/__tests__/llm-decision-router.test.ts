import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from '@jest/globals';

jest.mock('../../../db/postgres.js', () => ({
  getPostgresPool: jest.fn(() => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
  })),
}));

jest.mock('../../../middleware/observability/otel-tracing.js', () => ({
  otelService: {
    createSpan: jest.fn(() => ({
      addSpanAttributes: jest.fn(),
      end: jest.fn(),
    })),
  },
}));

import { DecisionRecorder } from '../decision-recorder.js';
import { LLMDecisionRouter } from '../llm-decision-router.js';
import { ReplayRunner } from '../replay-runner.js';
import { LearningToRankRouter, QueryFeatures } from '../learning-to-rank.js';

const baseFeatures: QueryFeatures = {
  complexity: 0.6,
  contextLength: 1200,
  urgency: 0.3,
  costSensitivity: 0.4,
  qualityRequirement: 0.9,
  domain: ['analysis'],
  estimatedTokens: 1000,
};

describe('LLMDecisionRouter audit trails', () => {
  let recorder: DecisionRecorder;
  let router: LLMDecisionRouter;
  let logPath: string;

  beforeEach(async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'llm-router-'));
    logPath = path.join(tempDir, 'decisions.jsonl');
    recorder = new DecisionRecorder(logPath);
    router = new LLMDecisionRouter(new LearningToRankRouter(), recorder);
  });

  it('records primary decisions and persists JSONL audit entries', async () => {
    const { record } = await router.route({
      prompt: 'Summarize the intelligence brief',
      context: { requestId: 'req-1' },
      tenantId: 'tenant-a',
      userId: 'user-1',
      policies: ['default-routing'],
      constraints: { allowedProviders: ['openai'] },
      features: baseFeatures,
      redactions: ['email-address'],
    });

    const persisted = await recorder.load(record.decisionId);
    expect(persisted?.outcome.provider).toBe('openai');
    expect(persisted?.outcome.guardrailActions.piiRedactions).toContain(
      'email-address',
    );

    const logContent = await fs.readFile(logPath, 'utf8');
    expect(logContent).toContain(record.decisionId);
  });

  it('honors preferred provider policy ordering', async () => {
    const { record } = await router.route({
      prompt: 'Draft a policy memo',
      context: {},
      tenantId: 'tenant-b',
      policies: ['prefer-anthropic', 'fallback-openai'],
      constraints: { preferredProviders: ['anthropic', 'openai'] },
      features: baseFeatures,
    });

    expect(record.request.policies).toEqual(['prefer-anthropic', 'fallback-openai']);
    expect(record.outcome.provider).toBe('anthropic');
  });

  it('records fallback attempts when constraints block the top option', async () => {
    const { record } = await router.route({
      prompt: 'Write a situational update',
      context: {},
      tenantId: 'tenant-c',
      constraints: { blockedModels: ['gpt-4o'] },
      features: baseFeatures,
    });

    const blocked = record.outcome.fallbacks.find(
      (fallback) => fallback.model === 'gpt-4o',
    );

    expect(blocked?.reason).toBe('model_blocked_by_policy');
    expect(record.outcome.provider).not.toBe('openai');
  });

  it('replays routing decisions deterministically with the stored prompt', async () => {
    const { record } = await router.route({
      prompt: 'Generate a concise executive summary',
      context: { locale: 'en-US' },
      tenantId: 'tenant-d',
      features: baseFeatures,
      redactions: ['phone-number'],
    });

    const replayRunner = new ReplayRunner(
      recorder,
      new LLMDecisionRouter(new LearningToRankRouter(), recorder),
    );

    const replay = await replayRunner.replay(record.decisionId);
    expect(replay.matches).toBe(true);
    expect(replay.renderedOutput).toContain('concise executive summary');
  });
});
