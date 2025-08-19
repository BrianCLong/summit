import type { AIService } from '../../services-types';

export function createAIService(): AIService {
  return {
    async enrichEntity(input) {
      return { ...input };
    },
  };
}
