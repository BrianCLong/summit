# LLM Router Architecture

## Overview

The LLM Router is a modular orchestration layer designed to manage interactions with Large Language Models (LLMs). It provides a unified interface for routing requests to various providers (OpenAI, Anthropic, etc.), enforcing policies (cost, latency), applying safety guardrails, and managing caching and audit logs.

## Architecture

The core component is the `LLMRouter` class, which orchestrates the following flow:

1.  **Request Intake**: Receives a standardized `LLMRequest`.
2.  **Safety Guardrails (Pre)**: Validates/sanitizes the request (e.g., PII redaction).
3.  **Cache Check**: Checks for an existing response in the cache.
4.  **Candidate Selection**: Identifies available providers supporting the requested model/tags.
5.  **Policy Application**: Filters and sorts candidates based on active policies (e.g., Cost, Latency).
6.  **Execution**: Attempts to generate a response from the sorted candidates, falling back to the next if one fails.
7.  **Safety Guardrails (Post)**: Validates/sanitizes the response.
8.  **Caching & Logging**: Caches the successful response and writes to the replay log.

## Extension Points

### 1. Providers

To add a new provider, implement the `ProviderAdapter` interface:

```typescript
export interface ProviderAdapter {
  name: ProviderType;
  isHealthy(): boolean;
  supports(model: string): boolean;
  estimateCost(request: LLMRequest): number;
  generate(request: LLMRequest): Promise<LLMResponse>;
  getCapabilities(): ModelCapability[];
}
```

### 2. Policies

To add a new routing logic, implement the `RoutingPolicy` interface:

```typescript
export interface RoutingPolicy {
  name: string;
  sortProviders(providers: ProviderAdapter[], request: LLMRequest): Promise<ProviderAdapter[]>;
}
```

### 3. Guardrails

To add safety checks, implement the `SafetyGuardrail` interface:

```typescript
export interface SafetyGuardrail {
  name: string;
  validateRequest(request: LLMRequest): Promise<LLMRequest>;
  validateResponse(response: LLMResponse): Promise<LLMResponse>;
}
```

## Caching & Replay Logs

- **Caching**: Currently uses an in-memory LRU cache. This is intended for short-term identical request deduplication.
- **Replay Logs**: Full request/response pairs are logged to JSON files in the configured `logDir`. This allows for offline analysis, debugging, and dataset generation. **Warning**: These logs may contain sensitive data; ensure `PIIGuardrail` is enabled and configured correctly.

## Configuration

The router is configured via `server/src/llm/config.ts`. You can toggle providers, policies, and guardrails via this file or environment variables.
