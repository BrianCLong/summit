# Design: Model Interface Refactor for Swappable Tiers

**Status:** Draft
**Date:** Jan 2026
**Context:** [Weekly Signal Checklist](../planning/WEEKLY_SIGNAL_CHECKLIST.md)

## 1. Problem
We need to cleanly swap between three distinct tiers of models to optimize for cost, latency, and privacy/deployment constraints:
1.  **Frontier API:** (e.g., GPT-4o, Claude 3.5) for high-reasoning, ambiguous tasks.
2.  **Self-Hosted Mid-Size:** (e.g., Falcon-H1R 7B, Qwen 14B) for air-gapped or cost-sensitive reasoning tasks.
3.  **SLMs (Small Language Models):** (e.g., Phi-3, Gemma 2B) for high-frequency micro-tasks (URL triage, entity extraction).

## 2. Existing Architecture
The `server/src/llm/` module already provides:
-   `LLMRouter`: Routes requests based on policies.
-   `ProviderAdapter`: Abstract interface for model providers.
-   `ModelCapability`: Metadata including `tags`.
-   `LLMRequest`: Accepts `tags` and `model`.

## 3. Proposed Solution
We will not rewrite the router but instead formalize the **Tagging Taxonomy** and **Routing Configuration**.

### 3.1 Tagging Taxonomy
We will introduce standard tags to `ModelCapability` in all `ProviderAdapter` implementations:

| Tag | Description | Target Models |
| :--- | :--- | :--- |
| `tier:frontier` | Highest reasoning capability, typically cloud API. | GPT-4o, Claude 3.5 Sonnet |
| `tier:mid` | Strong reasoning, deployable on single GPU/Consumer hardware. | Falcon-H1R, Qwen 14B, Llama 3 8B |
| `tier:slm` | Low latency, low resource, specific tasks. | Phi-3, Gemma, MobileLLM |
| `mode:offline` | Guaranteed no data egress (local execution). | Local models |
| `task:reasoning` | Good for complex chain-of-thought. | Frontier, Mid |
| `task:extraction` | Good for structured output/extraction. | All (SLMs preferred for cost) |

### 3.2 Configuration Strategy

Instead of hardcoding model IDs in application code, agents should request *capabilities*:

```typescript
// Example usage in an Agent
const response = await llmRouter.route({
  messages: [...],
  tags: ['tier:mid', 'task:reasoning'], // Prefers Falcon-H1R/Qwen
  // specific model ID is omitted to allow hot-swapping via config
});
```

### 3.3 Implementation Steps

1.  **Update `ProviderAdapter` implementations:**
    *   Ensure `getCapabilities()` returns the new tags.
    *   Example: `OpenAIProvider` tags `gpt-4o` with `['tier:frontier', 'task:reasoning']`.
    *   Example: A new `OllamaProvider` tags `falcon-h1r` with `['tier:mid', 'task:reasoning', 'mode:offline']`.

2.  **Add `MicroTaskPolicy` (RoutingPolicy):**
    *   A new policy that intercepts requests with `tag: 'task:micro'` and prioritizes `tier:slm` providers if available and healthy.
    *   Fallback to `tier:mid` then `tier:frontier`.

3.  **Configuration File (`llm-tiers.yaml`):**
    *   Map abstract tiers to specific model IDs per environment.
    *   Allow "Air Gap" mode to disable `tier:frontier` entirely.

## 4. Example: Supporting Falcon-H1R
To support Falcon-H1R (7B Transformer-Mamba), we would:
1.  Deploy the model via vLLM or Ollama.
2.  Configure the generic `OpenAICompatibleProvider` (or create `OllamaProvider`).
3.  Register it with tags: `['tier:mid', 'mode:offline', 'arch:hybrid-mamba']`.
4.  Update Agents to request `tier:mid` for standard analysis tasks.
