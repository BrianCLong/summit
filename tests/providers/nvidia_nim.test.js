"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const nvidia_nim_1 = require("../../server/src/llm/providers/nvidia_nim");
(0, globals_1.describe)('NvidiaNimProvider', () => {
    let provider;
    const mockFetch = globals_1.jest.fn();
    const originalFetch = global.fetch;
    (0, globals_1.beforeEach)(() => {
        global.fetch = mockFetch;
        provider = new nvidia_nim_1.NvidiaNimProvider({ apiKey: 'test-key' });
    });
    (0, globals_1.afterEach)(() => {
        global.fetch = originalFetch;
        mockFetch.mockReset();
    });
    (0, globals_1.test)('EVD-KIMIK25FREEAPI-PROV-001: happy path text completion', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                id: 'test-id',
                model: 'moonshotai/kimi-k2.5',
                choices: [{ message: { content: 'Hello' } }],
                usage: { prompt_tokens: 10, completion_tokens: 5 }
            })
        });
        const req = {
            id: 'req-1',
            requestId: 'req-1',
            messages: [{ role: 'user', content: 'Hi' }],
        };
        const res = await provider.generate(req);
        (0, globals_1.expect)(res.text).toBe('Hello');
        (0, globals_1.expect)(mockFetch).toHaveBeenCalledWith(globals_1.expect.stringContaining('https://integrate.api.nvidia.com/v1/chat/completions'), globals_1.expect.objectContaining({
            method: 'POST',
            headers: globals_1.expect.objectContaining({
                'authorization': 'Bearer test-key'
            })
        }));
    });
    (0, globals_1.test)('EVD-KIMIK25FREEAPI-MMOD-001: deny multimodal by default', async () => {
        const req = {
            id: 'req-2',
            requestId: 'req-2',
            messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
        };
        await (0, globals_1.expect)(provider.generate(req)).rejects.toThrow('Multimodal content not enabled');
    });
    (0, globals_1.test)('EVD-KIMIK25FREEAPI-MMOD-001: allow multimodal when enabled', async () => {
        provider = new nvidia_nim_1.NvidiaNimProvider({ apiKey: 'test-key', enableMultimodal: true });
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'Image analyzed' } }]
            })
        });
        const req = {
            id: 'req-3',
            requestId: 'req-3',
            messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: '...' } }] }],
        };
        const res = await provider.generate(req);
        (0, globals_1.expect)(res.text).toBe('Image analyzed');
    });
    (0, globals_1.test)('EVD-KIMIK25FREEAPI-GOV-001: redact secrets in error', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 401,
            text: async () => 'Invalid Bearer sk-12345'
        });
        const req = {
            id: 'req-4',
            requestId: 'req-4',
            messages: [{ role: 'user', content: 'hi' }]
        };
        await (0, globals_1.expect)(provider.generate(req)).rejects.toThrow('[REDACTED]');
        await (0, globals_1.expect)(provider.generate(req)).rejects.not.toThrow('sk-12345');
    });
    (0, globals_1.test)('EVD-KIMIK25FREEAPI-PROV-002: instant mode sets thinking disabled', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: 'Instant' } }] })
        });
        const req = { id: 'req-5', requestId: 'req-5', messages: [{ role: 'user', content: 'hi' }] };
        // Default mode is instant
        await provider.generate(req);
        (0, globals_1.expect)(mockFetch).toHaveBeenCalledWith(globals_1.expect.anything(), globals_1.expect.objectContaining({
            body: globals_1.expect.stringContaining('"thinking":{"type":"disabled"}')
        }));
        // Thinking mode
        const thinkingProvider = new nvidia_nim_1.NvidiaNimProvider({ apiKey: 'key', modeDefault: 'thinking' });
        await thinkingProvider.generate(req);
        (0, globals_1.expect)(mockFetch).toHaveBeenLastCalledWith(globals_1.expect.anything(), globals_1.expect.not.objectContaining({
            body: globals_1.expect.stringContaining('"thinking":{"type":"disabled"}')
        }));
    });
});
