# Multi-LLM Orchestrator

A resilient multi-LLM chaining system for Summit agents with governance gates, hallucination scoring, and intelligent fallback routing.

## Features

- **Multi-Provider Support**: Claude (3.5 Sonnet, Opus, Haiku), GPT-4, GPT-4o, o1-preview, o1-mini
- **Resilient Routing**: Circuit breaker pattern with automatic fallback to alternative providers
- **Governance Gates**: Content filtering, PII detection, toxicity checking, prompt injection detection
- **Hallucination Scoring**: Multi-factor analysis with consensus verification
- **State Management**: Redis-based session and budget tracking
- **Chain Execution**: Sequential, parallel, fallback, and consensus strategies

## Installation

```bash
pnpm add @intelgraph/multi-llm-orchestrator
```

## Quick Start

```typescript
import { MultiLLMOrchestrator } from '@intelgraph/multi-llm-orchestrator';

// Create orchestrator
const orchestrator = new MultiLLMOrchestrator({
  redis: { redisUrl: 'redis://localhost:6379' },
  hallucinationScoring: true,
});

// Simple completion
const result = await orchestrator.complete({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain quantum computing.' },
  ],
});

console.log(result.content);
console.log('Governance score:', result.governance.score);
console.log('Hallucination score:', result.hallucination?.overall);
```

## Chain Execution

Create multi-step chains with different LLM providers:

```typescript
// Create a chain
orchestrator.createSimpleChain('analysis-synthesis', 'Analysis and Synthesis', [
  {
    name: 'Deep Analysis',
    model: 'o1-preview',
    systemPrompt: 'Analyze the following input deeply and thoroughly.',
  },
  {
    name: 'Synthesis',
    model: 'claude-3-5-sonnet-20241022',
    systemPrompt: 'Synthesize the analysis into clear, actionable insights.',
  },
]);

// Execute chain
const chainResult = await orchestrator.executeChain(
  'analysis-synthesis',
  'Analyze the impact of AI on software development.',
);

console.log('Chain output:', chainResult.output);
console.log('Total cost:', chainResult.totalCostUSD);
console.log('Hallucination score:', chainResult.hallucinationScore.overall);
```

## Chain Strategies

| Strategy | Description |
|----------|-------------|
| `sequential` | Execute steps one after another, passing output as input |
| `parallel` | Execute all steps simultaneously, combine outputs |
| `fallback` | Try steps until one succeeds |
| `consensus` | Run multiple models, use hallucination scoring for consensus |

## Governance Gates

Built-in governance gates protect against:

- **Content Filtering**: Block sensitive patterns (passwords, API keys)
- **PII Detection**: Detect and redact emails, SSNs, phone numbers, credit cards
- **Toxicity Check**: Detect potentially harmful content
- **Prompt Injection**: Block jailbreak and manipulation attempts
- **Rate Limiting**: Control request frequency
- **Budget Limits**: Enforce cost controls

### Custom Gates

```typescript
const orchestrator = new MultiLLMOrchestrator({
  governance: [
    {
      id: 'custom-domain-filter',
      name: 'Domain Content Filter',
      type: 'custom',
      enabled: true,
      config: {
        customValidator: async (input, context) => {
          const hasProhibited = input.includes('confidential');
          return {
            valid: !hasProhibited,
            score: hasProhibited ? 0 : 1,
            issues: hasProhibited
              ? [{ type: 'domain', severity: 'high', message: 'Contains confidential information' }]
              : [],
          };
        },
      },
      action: 'block',
    },
  ],
});
```

## Hallucination Scoring

The hallucination scorer evaluates responses using multiple factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| Consistency | 0.25 | Relevance to prompt and context |
| Confidence Markers | 0.15 | Detection of overconfidence/uncertainty |
| Claims Density | 0.15 | Ratio of factual claims to content |
| Self-Contradiction | 0.20 | Internal consistency check |
| Hedging Language | 0.10 | Appropriate uncertainty expression |
| Model Agreement | 0.25 | Consensus across multiple models |

### Consensus Scoring

```typescript
// Use consensus strategy for high-stakes decisions
orchestrator.createSimpleChain('consensus-verification', 'Consensus Verification', [
  { name: 'Claude Analysis', model: 'claude-3-5-sonnet-20241022', systemPrompt: 'Analyze:' },
  { name: 'GPT Analysis', model: 'gpt-4o', systemPrompt: 'Analyze:' },
  { name: 'o1 Analysis', model: 'o1-mini', systemPrompt: 'Analyze:' },
]);

// Chain config with consensus strategy
const chain = {
  id: 'consensus-chain',
  strategy: 'consensus',
  // ... steps
};
```

## Circuit Breaker

Automatic failover when providers become unavailable:

```
┌─────────────────────────────────────────────────────────────┐
│                    Circuit Breaker States                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│    CLOSED ──────────► OPEN ──────────► HALF-OPEN            │
│      │                  │                   │                │
│      │ (success)        │ (timeout)         │                │
│      ▼                  │                   │                │
│    Allow               Block              Test               │
│   Requests            Requests           Request             │
│                                                              │
│    Failure threshold: 5 failures                            │
│    Success threshold: 3 successes to close                  │
│    Timeout: 30 seconds                                       │
└─────────────────────────────────────────────────────────────┘
```

## State Management

Redis-based state management for:

- **Session State**: Conversation history, context, usage tracking
- **Provider State**: Circuit breaker status, metrics
- **Budget State**: Daily/monthly cost tracking

```typescript
// Access session history
const history = await orchestrator.getSessionHistory(sessionId);

// Check health status
const health = await orchestrator.healthCheck();
console.log(health.details);
```

## Events

Subscribe to orchestrator events:

```typescript
orchestrator.on('chain:started', (payload) => {
  console.log('Chain started:', payload.chainId);
});

orchestrator.on('governance:violation', (payload) => {
  console.log('Violation:', payload.data.violations);
});

orchestrator.on('hallucination:detected', (payload) => {
  console.log('Hallucination detected:', payload.data.score);
});

orchestrator.on('circuit:opened', (payload) => {
  console.log('Circuit opened for:', payload.data.providerId);
});
```

## API Reference

### MultiLLMOrchestrator

#### Constructor Options

```typescript
interface MultiLLMOrchestratorConfig {
  redis?: {
    redisUrl?: string;
    keyPrefix?: string;
    sessionTTL?: number;
  };
  routing?: {
    fallbackOrder?: LLMModel[];
    maxFallbackAttempts?: number;
    costOptimization?: boolean;
  };
  budget?: {
    maxRequestCostUSD?: number;
    maxDailyCostUSD?: number;
    maxMonthlyCostUSD?: number;
  };
  governance?: GovernanceGate[];
  hallucinationScoring?: boolean;
  defaultModel?: LLMModel;
}
```

#### Methods

| Method | Description |
|--------|-------------|
| `complete(request, options)` | Execute a single completion with governance |
| `executeChain(chainId, input, options)` | Execute a registered chain |
| `registerChain(chain)` | Register a chain configuration |
| `createSimpleChain(id, name, steps)` | Create and register a simple chain |
| `getSessionHistory(sessionId)` | Get conversation history |
| `getHealthStatus()` | Get provider health status |
| `getMetrics()` | Get orchestrator metrics |
| `healthCheck()` | Perform health check |
| `shutdown()` | Gracefully shutdown |

## Supported Models

| Model | Provider | Tools | Streaming | Best For |
|-------|----------|-------|-----------|----------|
| claude-3-5-sonnet-20241022 | Anthropic | ✅ | ✅ | Coding, analysis, creativity |
| claude-3-opus-20240229 | Anthropic | ✅ | ✅ | Complex reasoning |
| claude-3-haiku-20240307 | Anthropic | ✅ | ✅ | Speed, cost efficiency |
| gpt-4-turbo | OpenAI | ✅ | ✅ | General purpose |
| gpt-4o | OpenAI | ✅ | ✅ | Multimodal, speed |
| gpt-4o-mini | OpenAI | ✅ | ✅ | Cost efficiency |
| o1-preview | OpenAI | ❌ | ❌ | Deep reasoning, math |
| o1-mini | OpenAI | ❌ | ❌ | Reasoning, coding |

## Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

## License

MIT
