"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const nvidia_nim_js_1 = require("../server/src/llm/providers/nvidia-nim.js");
const assert = __importStar(require("assert"));
async function verify() {
    console.log('Verifying NvidiaNimProvider...');
    const provider = new nvidia_nim_js_1.NvidiaNimProvider({
        apiKey: 'nvapi-test-key',
        modeDefault: 'instant'
    });
    // Test supports
    assert.strictEqual(provider.supports('moonshotai/kimi-k2.5'), true);
    assert.strictEqual(provider.supports('gpt-4'), false);
    console.log('✓ supports() works');
    // Test request building (by mocking fetch)
    const globalAny = global;
    globalAny.fetch = async (url, init) => {
        const body = JSON.parse(init.body);
        assert.ok(url.includes('/chat/completions'));
        assert.strictEqual(init.method, 'POST');
        assert.strictEqual(init.headers['Authorization'], 'Bearer nvapi-test-key');
        assert.strictEqual(body.model, 'moonshotai/kimi-k2.5');
        assert.strictEqual(body.extra_body.thinking.type, 'disabled');
        return {
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'mock response' } }],
                usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
            })
        };
    };
    const result = await provider.chat({
        tenantId: 'test',
        purpose: 'other',
        riskLevel: 'low',
        messages: [{ role: 'user', content: 'hi' }],
        model: 'moonshotai/kimi-k2.5'
    });
    assert.strictEqual(result.content, 'mock response');
    assert.strictEqual(result.provider, 'nvidia-nim');
    console.log('✓ chat() works (text)');
    console.log('All verifications passed!');
}
verify().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
