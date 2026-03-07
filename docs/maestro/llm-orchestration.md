# LLM Orchestration & Routing

## Overview

The LLM Orchestration layer provides a unified, reliable, and policy-driven way for the Maestro system to interact with Large Language Models. It abstracts away the complexity of multiple providers (OpenAI, Anthropic, etc.), handles cost and latency optimization, and enforces safety guardrails.

## Architecture

### Core Components

1.  **LLMRouter**: The central component that accepts `LLMRequest`s and returns `LLMResult`s. It orchestrates policy selection, provider execution, and guardrail application.
2.  **Providers**: Abstractions for specific LLM services (e.g., `OpenAIProvider`, `AnthropicProvider`, `MockProvider`). They handle the API specifics.
3.  **Policies**: Logic to select the best provider for a given request (e.g., `CostControlPolicy`, `LatencyPolicy`).
4.  **Guardrails**: Pre- and post-processing steps to ensure safety and compliance (e.g., `PIIGuardrail`).
5.  **Observability**: Integrated logging and metrics to track usage, costs, and errors.

### Flow

1.  **Request**: Caller (e.g., Maestro) submits a request with `taskType`, `prompt`, and metadata.
2.  **Pre-Process Guardrails**: Request is sanitized (e.g., PII redaction).
3.  **Policy Selection**: Router determines the routing policy based on configuration (default or override).
4.  **Provider Selection**: Policy selects the best available provider from the configured candidates.
5.  **Execution**: Selected provider executes the request.
6.  **Post-Process Guardrails**: Response is checked for safety violations.
7.  **Result**: Structured result is returned to the caller.

## Configuration

Configuration is defined in `server/src/config/llm-router.config.ts`. It includes:

- **Providers**: List of enabled providers, their API keys (env vars), and model mappings.
- **Routing**: Default policy and task-specific overrides.
- **Budgets**: Global and per-tenant cost limits (future implementation).

Example:

```typescript
export const llmRouterConfig: LLMRouterConfig = {
  providers: [
    {
      name: "openai",
      type: "openai",
      apiKeyEnv: "OPENAI_API_KEY",
      models: { analysis: "gpt-4o" },
    },
  ],
  routing: {
    defaultPolicy: "cost-control",
    overrides: { code: "latency" },
  },
};
```

## Usage

Use the `MaestroLLMService` singleton to make calls:

```typescript
import { MaestroLLMService } from "@/services/llm/MaestroLLMService";

const result = await MaestroLLMService.getInstance().executeTaskLLM({
  taskType: "analysis",
  prompt: "Analyze this data...",
  tenantId: "tenant-123",
});

if (result.ok) {
  console.log(result.text);
} else {
  console.error(result.error);
}
```

## Extensibility

- **New Provider**: Implement the `LLMProvider` interface and add to config.
- **New Policy**: Implement `RoutingPolicy` and register in `LLMRouter`.
- **New Guardrail**: Implement `SafetyGuardrail` and add to `LLMRouter` pipeline.
