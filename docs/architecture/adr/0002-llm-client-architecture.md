# ADR-0002: Centralized LLM Client Architecture with Local-First Routing

**Date:** 2024-03-01
**Status:** Accepted
**Area:** AI/ML
**Owner:** AI Platform Guild
**Tags:** llm, ai, litellm, ollama, copilot, local-first

## Context

Summit's intelligence platform incorporates AI capabilities across multiple features:

- **Copilot**: Interactive AI assistant for investigation workflows
- **Document Analysis**: Automated entity extraction and summarization
- **Code Generation**: AI-assisted query building and report generation
- **Anomaly Detection**: ML-augmented pattern recognition

Challenges we faced:

1. **Multi-provider complexity**: Different features prefer different models (GPT-4 for reasoning, Claude for analysis, local models for cost-sensitive tasks)
2. **Cost control**: Uncontrolled cloud API usage can exceed $10k/month
3. **Latency requirements**: Real-time features need <5s response times
4. **Offline capability**: Air-gapped deployments must function without internet
5. **Vendor lock-in**: Direct SDK integration couples code to specific providers
6. **Security**: Sensitive intelligence data should not leave on-premise by default

Requirements:

- Single LLM interface for all features
- Configuration-driven model routing (no code changes to swap models)
- Local model support for cost-sensitive and offline scenarios
- Budget enforcement and usage tracking
- Streaming responses for real-time UX
- Fallback chains for reliability

## Decision

### Core Decision

We implement a **centralized LLM client architecture** using **LiteLLM** for multi-provider routing with a **local-first strategy** that prefers on-premise models (Ollama) and falls back to cloud APIs only when necessary.

### Key Components

- **LiteLLM**: Unified API proxy supporting 100+ LLM providers
- **Ollama**: Local model runtime for CPU/GPU inference
- **Maestro Workflow Engine**: Orchestrates LLM-powered workflows with retry/fallback logic
- **Cost Tracker**: Monitors token usage and enforces budget limits
- **Model Router**: Configuration-driven routing based on task type, budget, and availability

### Implementation Details

**Routing Configuration** (`litellm.config.yaml`):

```yaml
model_list:
  # Primary: Local models via Ollama
  - model_name: "local/qwen-coder"
    litellm_params:
      model: "ollama/qwen2.5-coder:7b"
      api_base: "http://127.0.0.1:11434"

  - model_name: "local/llama-8b"
    litellm_params:
      model: "ollama/llama3.1:8b"
      api_base: "http://127.0.0.1:11434"

  # Fallback: Cloud APIs (budget-limited)
  - model_name: "cloud/deepseek-v3"
    litellm_params:
      model: "openrouter/deepseek/deepseek-chat"
      api_base: "https://openrouter.ai/v1"

router_settings:
  routing_strategy: "simple-shuffle"
  fallbacks:
    - ["local/llama-8b", "local/qwen-coder"]
  timeout: 60
  num_retries: 2
```

**LLM Client Interface** (`server/src/services/llm.ts`):

```typescript
export interface LLMClient {
  stream(input: string, signal: AbortSignal): AsyncGenerator<string>;
}
```

**Workflow Integration** (`packages/maestro-core/src/plugins/litellm-plugin.ts`):

- Prompt templates for common tasks (code review, documentation, test generation)
- Tool calling support for function execution
- Cost tracking per request
- Retry with exponential backoff

## Alternatives Considered

### Alternative 1: Direct Provider SDKs

- **Description:** Use OpenAI SDK, Anthropic SDK, etc. directly in each feature
- **Pros:**
  - Full access to provider-specific features
  - No abstraction overhead
  - Well-documented SDKs
- **Cons:**
  - Tight coupling to specific providers
  - Code changes required to swap models
  - Duplicate error handling across features
  - No unified cost tracking
  - Difficult to add local model support
- **Cost/Complexity:** Lower initial complexity, higher maintenance burden

### Alternative 2: LangChain/LangGraph

- **Description:** Use LangChain abstractions for model management
- **Pros:**
  - Rich ecosystem of chains and agents
  - Good documentation
  - Active community
- **Cons:**
  - Heavy abstraction (adds latency)
  - Frequent breaking changes
  - Harder to debug (many layers)
  - Not optimized for local-first scenarios
  - Opinionated patterns may not fit our needs
- **Cost/Complexity:** Medium complexity, risk of abstraction mismatch

### Alternative 3: vLLM/LocalAI

- **Description:** Self-hosted inference servers with OpenAI-compatible API
- **Pros:**
  - High performance for self-hosted models
  - GPU optimization built-in
  - OpenAI-compatible API
- **Cons:**
  - Requires GPU infrastructure
  - More complex deployment
  - Limited model selection compared to Ollama
  - No built-in routing/fallback
- **Cost/Complexity:** Higher infrastructure complexity, better performance

### Alternative 4: Custom Abstraction Layer

- **Description:** Build our own LLM router from scratch
- **Pros:**
  - Full control over behavior
  - No external dependencies
  - Tailored to our exact needs
- **Cons:**
  - Significant engineering investment
  - Must implement provider integrations ourselves
  - Ongoing maintenance burden
  - Reinventing solved problems
- **Cost/Complexity:** High complexity, not justified for our scale

## Consequences

### Positive

- **Cost reduction**: Local-first routing reduces cloud API costs by ~80% (from $8k to $1.5k/month)
- **Latency improvement**: Ollama responses in 1-3s vs 5-10s for cloud APIs
- **Offline capability**: Air-gapped deployments work with local models
- **Vendor flexibility**: Swap providers via config, no code changes
- **Unified monitoring**: Single dashboard for all LLM usage and costs
- **Security**: Sensitive data stays on-premise by default

### Negative

- **Model capability**: Local 7-8B models less capable than GPT-4/Claude for complex reasoning
- **Infrastructure**: Ollama requires CPU/RAM resources on dev machines
- **Maintenance**: Must update Ollama models periodically
- **Complexity**: Additional moving parts (Ollama service, LiteLLM proxy)
- **Testing**: Local model responses less deterministic than cloud APIs

### Neutral

- Cloud APIs remain available for tasks requiring frontier models
- Feature teams choose between `local/*` and `cloud/*` models based on requirements
- Cost tracking shifts from per-team to centralized platform ownership

### Operational Impact

- **Monitoring**: Track token usage, latency percentiles, error rates per model
- **Cost**: Budget alerts at 80% of monthly limit ($500 default)
- **Performance**: p95 latency target <5s for streaming responses
- **Reliability**: Fallback chains ensure availability (99.9% target)

## Code References

### Core Implementation

- `server/src/services/llm.ts` - LLM client interface and streaming wrapper
- `litellm.config.yaml` - Model routing configuration
- `packages/maestro-core/src/plugins/litellm-plugin.ts` - Workflow integration

### Configuration

- `docker-compose.ai.yml` - Ollama service definition
- `.env.example` - LLM environment variables

### API Layer

- `server/src/routes/copilot.ts` - Copilot API endpoint
- `services/ai-sandbox/` - AI experimentation service

## Tests & Validation

### Unit Tests

- `server/src/services/__tests__/llm.test.ts` - LLM client unit tests
- Mock implementations for deterministic testing
- Expected coverage: 80%+

### Integration Tests

- `tests/integration/llm/routing.test.ts` - Model routing validation
- `tests/integration/llm/fallback.test.ts` - Fallback chain testing
- `tests/integration/copilot/streaming.test.ts` - End-to-end streaming

### Performance Tests

- Token generation rate benchmarks (target: >50 tokens/s local)
- Latency percentiles (p50, p95, p99)
- Concurrent request handling (target: 50 concurrent streams)

### CI Enforcement

- LLM service health checks in `make smoke`
- Budget alerts integrated with CI (fail if budget exceeded)
- Model availability checks before deployment

## Related ADRs

- ADR-0003: Graph-First Intelligence Engine (provides context for copilot)
- ADR-0012: Copilot GraphRAG Architecture (consumes LLM client)
- ADR-0009: PostgreSQL + pgvector (embeddings for semantic search)

## References

- [LiteLLM Documentation](https://docs.litellm.ai/)
- [Ollama](https://ollama.ai/)
- [OpenRouter](https://openrouter.ai/)
- [Local-First Software](https://www.inkandswitch.com/local-first/)

---

## Revision History

| Date       | Author            | Change                                        |
| ---------- | ----------------- | --------------------------------------------- |
| 2024-03-01 | AI Platform Guild | Initial version                               |
| 2024-08-15 | AI Platform Guild | Added Qwen2.5 and DeepSeek-V3 models          |
| 2025-12-06 | Architecture Team | Migrated to /docs/architecture/adr/ framework |
