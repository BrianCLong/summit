import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { LLMService, CompletionOptions } from '../../services/LLMService.js';
import { OpenAI } from 'openai';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
      embeddings: {
        create: jest.fn(),
      },
    })),
  };
});

describe('LLMService', () => {
  let llmService: LLMService;
  let mockOpenAI: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
    llmService = new LLMService();
    mockOpenAI = (llmService as any).openai;
  });

  it('should call OpenAI with correct parameters for complete', async () => {
    const prompt = 'Test prompt';
    const options: CompletionOptions = {
      model: 'gpt-4',
      temperature: 0.5,
      maxTokens: 100,
    };

    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'Test response' } }],
      usage: { total_tokens: 10 },
    });

    const result = await llmService.complete(prompt, options);

    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 100,
    });

    expect(result).toBe('Test response');
  });

  it('should handle JSON response format', async () => {
    const prompt = 'Test JSON';
    const options: CompletionOptions = {
      responseFormat: 'json',
    };

    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: '{"foo":"bar"}' } }],
      usage: { total_tokens: 10 },
    });

    await llmService.complete(prompt, options);

    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        response_format: { type: 'json_object' },
      })
    );
  });

  it('should support chat completion', async () => {
    const messages = [{ role: 'user', content: 'Hello' }] as any;

    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'Hi there' } }],
      usage: { total_tokens: 10 },
    });

    const result = await llmService.chat(messages);

    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: messages,
      })
    );
    expect(result).toBe('Hi there');
  });
});
