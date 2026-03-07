import assert from 'node:assert/strict';
import test from 'node:test';

import { LocalLmStudioProvider } from '../../../src/agents/providers/localLmStudioProvider.ts';

test('returns content from first choice message', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: 'hello' } }],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as typeof fetch;

  try {
    const provider = new LocalLmStudioProvider({
      baseUrl: 'http://localhost:1234/v1',
    });
    const result = await provider.chat({
      model: 'qwen3-coder-next',
      messages: [{ role: 'user', content: 'ping' }],
    });

    assert.equal(result.text, 'hello');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('throws on non-200 responses', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response('server error', {
      status: 500,
      headers: { 'content-type': 'text/plain' },
    })) as typeof fetch;

  try {
    const provider = new LocalLmStudioProvider({
      baseUrl: 'http://localhost:1234/v1',
    });

    await assert.rejects(
      provider.chat({
        model: 'qwen3-coder-next',
        messages: [{ role: 'user', content: 'ping' }],
      }),
      /LMStudio provider error: 500 server error/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
