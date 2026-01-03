import { describe, expect, jest, test } from '@jest/globals';
jest.mock('../../src/config.js', () => ({
  Env: { safeParse: () => ({ success: true, data: {} }) },
  ENV_VAR_HELP: {},
}));

jest.mock('../../src/config/logger.js', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  correlationStorage: { getStore: () => new Map() },
}));

import { IntrinsicMemoryEngine } from '../../src/llm/agents/intrinsicMemoryEngine.js';
import type {
  ChatCompletionRequest,
  ChatCompletionResult,
  ChatMessage,
  LlmOrchestrator,
} from '../../src/llm/types.js';

describe('IntrinsicMemoryEngine', () => {
  test('constructContext includes task, memory, and newest turns within budget', () => {
    const engine = new IntrinsicMemoryEngine();
    const history: ChatMessage[] = [
      { role: 'user', content: 'Initial task description' },
      { role: 'assistant', content: 'First reply' },
      { role: 'user', content: 'Follow up question' },
      { role: 'assistant', content: 'Second reply' },
    ];
    const context = engine.constructContext({
      task: 'Initial task description',
      agentId: 'agent-1',
      conversationHistory: history,
      agentMemory: { summary: 'state' },
      tokenBudget: 200,
      estimateTokens: (text) => text.length, // deterministic
    });

    expect(context[0]).toEqual(history[0]);
    expect(context[1].role).toBe('system');
    expect(context[1].content).toContain('"summary":"state"');
    expect(context[context.length - 1].content).toBe('Second reply');
    expect(context.slice(-2).map((msg) => msg.content)).toEqual([
      'Follow up question',
      'Second reply',
    ]);
  });

  test('updateAgentMemory formats prompt and validates JSON responses', async () => {
    const engine = new IntrinsicMemoryEngine();
    const chatMock = jest.fn(async (_request: ChatCompletionRequest) => ({
      provider: 'mock' as const,
      model: 'mock-model',
      content: '{"task_summary":"updated"}',
    } as ChatCompletionResult));
    const orchestrator: LlmOrchestrator = {
      chat: chatMock as unknown as (
        request: ChatCompletionRequest,
      ) => Promise<ChatCompletionResult>,
    };

    const updated = await engine.updateAgentMemory({
      agentId: 'agent-2',
      agentRole: 'reviewer',
      tenantId: 'tenant-1',
      orchestrator,
      previousMemory: { task_summary: 'old' },
      agentOutput: 'New facts surfaced',
      enableDynamicTemplate: false,
      task: 'Review task',
    });

    expect(chatMock).toHaveBeenCalledTimes(1);
    const promptRequest = chatMock.mock.calls[0]?.[0] as ChatCompletionRequest;
    const prompt = promptRequest?.messages?.[0]?.content as string;
    expect(prompt).toContain('working as reviewer');
    expect(prompt).toContain('New facts surfaced');
    expect(prompt).toContain('old');
    expect(updated).toEqual({ task_summary: 'updated' });
  });

  test('updateAgentMemory falls back to previous memory on invalid JSON', async () => {
    const engine = new IntrinsicMemoryEngine();
    const orchestrator: LlmOrchestrator = {
      chat: jest.fn(async () => ({
        provider: 'mock',
        model: 'mock-model',
        content: 'not-json',
      } as ChatCompletionResult)) as unknown as (
        request: ChatCompletionRequest,
      ) => Promise<ChatCompletionResult>,
    };

    const previousMemory = { task_summary: 'stable' };
    const result = await engine.updateAgentMemory({
      agentId: 'agent-3',
      agentRole: 'executor',
      tenantId: 'tenant-1',
      orchestrator,
      previousMemory,
      agentOutput: 'some output',
      enableDynamicTemplate: false,
      task: 'Execute task',
    });

    expect(result).toEqual(previousMemory);
  });
});
