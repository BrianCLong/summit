"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const LLMService_js_1 = require("../../services/LLMService.js");
// Mock OpenAI
globals_1.jest.mock('openai', () => {
    return {
        OpenAI: globals_1.jest.fn().mockImplementation(() => ({
            chat: {
                completions: {
                    create: globals_1.jest.fn(),
                },
            },
            embeddings: {
                create: globals_1.jest.fn(),
            },
        })),
    };
});
(0, globals_1.describe)('LLMService', () => {
    let llmService;
    let mockOpenAI;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        process.env.OPENAI_API_KEY = 'test-key';
        llmService = new LLMService_js_1.LLMService();
        mockOpenAI = llmService.openai;
    });
    (0, globals_1.it)('should call OpenAI with correct parameters for complete', async () => {
        const prompt = 'Test prompt';
        const options = {
            model: 'gpt-4',
            temperature: 0.5,
            maxTokens: 100,
        };
        mockOpenAI.chat.completions.create.mockResolvedValue({
            choices: [{ message: { content: 'Test response' } }],
            usage: { total_tokens: 10 },
        });
        const result = await llmService.complete(prompt, options);
        (0, globals_1.expect)(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            max_tokens: 100,
        });
        (0, globals_1.expect)(result).toBe('Test response');
    });
    (0, globals_1.it)('should handle JSON response format', async () => {
        const prompt = 'Test JSON';
        const options = {
            responseFormat: 'json',
        };
        mockOpenAI.chat.completions.create.mockResolvedValue({
            choices: [{ message: { content: '{"foo":"bar"}' } }],
            usage: { total_tokens: 10 },
        });
        await llmService.complete(prompt, options);
        (0, globals_1.expect)(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            response_format: { type: 'json_object' },
        }));
    });
    (0, globals_1.it)('should support chat completion', async () => {
        const messages = [{ role: 'user', content: 'Hello' }];
        mockOpenAI.chat.completions.create.mockResolvedValue({
            choices: [{ message: { content: 'Hi there' } }],
            usage: { total_tokens: 10 },
        });
        const result = await llmService.chat(messages);
        (0, globals_1.expect)(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            messages: messages,
        }));
        (0, globals_1.expect)(result).toBe('Hi there');
    });
});
