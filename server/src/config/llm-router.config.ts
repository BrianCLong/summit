
import { LLMRouterConfig } from '../services/llm/interfaces';

export const llmRouterConfig: LLMRouterConfig = {
  providers: [
    {
      name: 'openai',
      type: 'openai',
      apiKeyEnv: 'OPENAI_API_KEY',
      models: {
        'analysis': 'gpt-4o',
        'code': 'gpt-4o',
        'chat': 'gpt-4o-mini',
      },
      default: true
    },
    {
      name: 'anthropic',
      type: 'anthropic',
      apiKeyEnv: 'ANTHROPIC_API_KEY',
      models: {
        'analysis': 'claude-3-opus-20240229',
        'code': 'claude-3-opus-20240229',
        'chat': 'claude-3-haiku-20240307',
      }
    },
    {
        name: 'mock',
        type: 'mock',
        apiKeyEnv: 'MOCK_API_KEY', // Not strictly needed
        models: {
            'analysis': 'mock-analysis',
            'code': 'mock-code',
            'chat': 'mock-chat'
        }
    }
  ],
  routing: {
    defaultPolicy: 'cost-control',
    overrides: {
        'code': 'latency'
    }
  },
  budgets: {
    globalDailyUsd: 100.00
  }
};
