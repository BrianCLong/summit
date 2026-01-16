import type { NormalizedRequest, NormalizedResponse, ProviderAdapter } from '../types.js';

export const createBedrockAdapter = (): ProviderAdapter => {
  return {
    id: 'bedrock',
    run: async (_request: NormalizedRequest): Promise<NormalizedResponse> => {
      throw new Error('Bedrock adapter is intentionally constrained. Configure implementation as needed.');
    },
  };
};
