import type { ContractContext, ContractResult, ProviderAdapter } from '../types.js';
import type { ContractTest } from './types.js';

export const headersSanityContract: ContractTest = {
  id: 'headers_sanity',
  description: 'Basic request/response sanity check',
  run: async (adapter: ProviderAdapter, context: ContractContext): Promise<ContractResult> => {
    const prompt = 'Reply with the single word ok.';
    const response = await adapter.run({
      prompt,
      maxTokens: 8,
      temperature: 0,
    });

    const passed = response.status >= 200 && response.status < 300;
    return {
      id: 'headers_sanity',
      passed,
      details: passed ? 'Basic response received.' : 'Provider returned non-2xx response.',
      metadata: {
        status: response.status,
        durationMs: response.durationMs,
        promptHash: context.promptHash(prompt),
        request: {
          maxTokens: 8,
          temperature: 0,
        },
        response: {
          headerKeys: Object.keys(response.headers),
        },
      },
    };
  },
};
