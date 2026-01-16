import type { NormalizedRequest, NormalizedResponse, ProviderAdapter } from '../types.js';

export const createAzureOpenAIAdapter = (): ProviderAdapter => {
  return {
    id: 'azure_openai',
    run: async (_request: NormalizedRequest): Promise<NormalizedResponse> => {
      throw new Error('Azure OpenAI adapter is intentionally constrained. Configure implementation as needed.');
    },
  };
};
