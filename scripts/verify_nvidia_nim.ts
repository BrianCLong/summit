import { NvidiaNimProvider } from '../server/src/llm/providers/nvidia-nim.js';
import * as assert from 'assert';

async function verify() {
  console.log('Verifying NvidiaNimProvider...');

  const provider = new NvidiaNimProvider({
    apiKey: 'nvapi-test-key',
    modeDefault: 'instant'
  });

  // Test supports
  assert.strictEqual(provider.supports('moonshotai/kimi-k2.5'), true);
  assert.strictEqual(provider.supports('gpt-4'), false);
  console.log('✓ supports() works');

  // Test request building (by mocking fetch)
  const globalAny: any = global;
  globalAny.fetch = async (url: string, init: any) => {
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
