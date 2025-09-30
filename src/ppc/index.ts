import { policy as composePolicy } from './dsl';
import { createAnthropicAdapter, createOpenAIAdapter } from './adapters';

export * from './types';
export { policy } from './dsl';
export { createOpenAIAdapter, createAnthropicAdapter } from './adapters';

export const ppc = {
  policy: composePolicy,
  adapters: {
    openai: createOpenAIAdapter,
    anthropic: createAnthropicAdapter,
  },
};
