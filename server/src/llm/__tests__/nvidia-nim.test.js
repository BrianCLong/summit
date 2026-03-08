"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const nvidia_nim_js_1 = require("../providers/nvidia-nim.js");
const fs_1 = require("fs");
const path_1 = require("path");
const nimTextFixture = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(process.cwd(), 'src/llm/__tests__/fixtures/nim_text.json'), 'utf8'));
(0, globals_1.describe)('NvidiaNimProvider', () => {
    let provider;
    const apiKey = 'nvapi-test-key';
    (0, globals_1.beforeEach)(() => {
        provider = new nvidia_nim_js_1.NvidiaNimProvider({
            apiKey,
            modeDefault: 'instant'
        });
        // @ts-ignore
        global.fetch = globals_1.jest.fn();
    });
    (0, globals_1.it)('EVD-KIMIK25FREEAPI-PROV-001: successful text completion', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => nimTextFixture
        });
        const request = {
            tenantId: 'test-tenant',
            purpose: 'other',
            riskLevel: 'low',
            messages: [{ role: 'user', content: 'Hello' }],
            model: 'moonshotai/kimi-k2.5'
        };
        const result = await provider.chat(request);
        (0, globals_1.expect)(result.content).toBe('Hello! How can I help you today?');
        (0, globals_1.expect)(result.provider).toBe('nvidia-nim');
    });
    (0, globals_1.it)('EVD-KIMIK25FREEAPI-PROV-002: instant mode sets thinking disabled', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => nimTextFixture
        });
        const request = {
            tenantId: 'test-tenant',
            purpose: 'other',
            riskLevel: 'low',
            messages: [{ role: 'user', content: 'Hello' }],
            model: 'moonshotai/kimi-k2.5',
            mode: 'instant'
        };
        await provider.chat(request);
        const fetchCall = global.fetch.mock.calls[0];
        const body = JSON.parse(fetchCall[1].body);
        (0, globals_1.expect)(body.extra_body.thinking.type).toBe('disabled');
    });
});
