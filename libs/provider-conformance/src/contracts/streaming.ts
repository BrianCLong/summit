import type { ContractContext, ContractResult, ProviderAdapter } from '../types.js';
import type { ContractTest } from './types.js';

export const streamingContract: ContractTest = {
  id: 'streaming',
  description: 'Check streaming availability',
  run: async (adapter: ProviderAdapter, context: ContractContext): Promise<ContractResult> => {
    const prompt = 'Reply with the word streaming.';
    const response = await adapter.run({
      prompt,
      maxTokens: 8,
      temperature: 0,
      stream: true,
    });

    const streamingSupported = Boolean(response.streaming);

    return {
      id: 'streaming',
      passed: true,
      details: streamingSupported
        ? 'Streaming response detected.'
        : 'Streaming response not detected.',
      capabilities: {
        streaming: streamingSupported,
      },
      metadata: {
        promptHash: context.promptHash(prompt),
        request: {
          maxTokens: 8,
          temperature: 0,
          stream: true,
        },
        response: {
          headerKeys: Object.keys(response.headers),
        },
      },
    };
  },
};
