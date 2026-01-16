import type { ContractContext, ContractResult, ProviderAdapter } from '../types.js';
import { pickRateLimitHeaders } from '../utils.js';
import type { ContractTest } from './types.js';

export const rateLimitContract: ContractTest = {
  id: 'rate_limit',
  description: 'Capture rate-limit signaling headers',
  run: async (adapter: ProviderAdapter, context: ContractContext): Promise<ContractResult> => {
    const prompt = 'Reply with ok.';
    const response = await adapter.run({
      prompt,
      maxTokens: 8,
      temperature: 0,
    });

    const signals = pickRateLimitHeaders(response.headers);
    const detected = Boolean(signals.limit || signals.remaining || signals.reset);

    return {
      id: 'rate_limit',
      passed: true,
      details: detected ? 'Rate-limit headers detected.' : 'No rate-limit headers detected.',
      capabilities: {
        rateLimit: {
          detected,
          status: response.status,
          ...signals,
        },
      },
      metadata: {
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
