import type { ContractContext, ContractResult, ProviderAdapter } from '../types.js';
import { wordCount } from '../utils.js';
import type { ContractTest } from './types.js';

const expectedWordCount = 20;
const maxTokens = 8;

export const maxTokensContract: ContractTest = {
  id: 'max_tokens',
  description: 'Detect max tokens/truncation behavior',
  run: async (adapter: ProviderAdapter, context: ContractContext): Promise<ContractResult> => {
    const prompt = `Reply with exactly ${expectedWordCount} words.`;
    const response = await adapter.run({
      prompt,
      maxTokens,
      temperature: 0,
    });

    const responseText = response.text ?? '';
    const observedWordCount = wordCount(responseText);
    const truncated = observedWordCount < expectedWordCount;

    return {
      id: 'max_tokens',
      passed: true,
      details: truncated
        ? 'Response length shorter than requested word count.'
        : 'Response length meets or exceeds requested word count.',
      capabilities: {
        maxTokensProbe: {
          maxTokens,
          expectedWordCount,
          observedWordCount,
          truncated,
        },
      },
      metadata: {
        observedWordCount,
        promptHash: context.promptHash(prompt),
        request: {
          maxTokens,
          temperature: 0,
        },
        response: {
          headerKeys: Object.keys(response.headers),
        },
      },
    };
  },
};
