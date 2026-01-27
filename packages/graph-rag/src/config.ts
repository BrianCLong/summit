import { GraphRAGConfig } from './types.js';

export function validateModelConfig(config: GraphRAGConfig): void {
  if (!config.allowed_models.includes(config.model)) {
    throw new Error(`Model '${config.model}' is not in the allowed list: ${config.allowed_models.join(', ')}`);
  }
}
