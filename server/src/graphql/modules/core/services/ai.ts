import type { AIService } from '../../services-types.js';

export function createAIService(): AIService {
  return {
    async enrichEntity(input) {
      return { ...input };
    },
  };
}
