import type { NormalizedRequest, NormalizedResponse, ProviderAdapter } from '../types.js';

export const createVertexAdapter = (): ProviderAdapter => {
  return {
    id: 'vertex',
    run: async (_request: NormalizedRequest): Promise<NormalizedResponse> => {
      throw new Error('Vertex adapter is intentionally constrained. Configure implementation as needed.');
    },
  };
};
