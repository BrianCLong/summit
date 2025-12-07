
# LLM Orchestration Platform

## Overview
Summit now features a centralized LLM Orchestration Layer located in `server/src/llm/`. This platform ensures that all LLM interactions are:
- **Routed** intelligently based on risk, cost, and purpose.
- **Safe** with pre/post-flight checks for PII and injections.
- **Observable** with metering and detailed logging.
- **Reusable** via a Prompt Catalog and Tool Registry.

## Core Components

### LlmOrchestrator
The `SummitLlmOrchestrator` is the main entry point. It coordinates routing, safety, execution, and metering.

```typescript
const orchestrator = new SummitLlmOrchestrator();
const result = await orchestrator.chat({
    tenantId: 'tenant-123',
    purpose: 'rag_answer',
    riskLevel: 'medium',
    messages: [...]
});
```

### Providers
We support multiple providers via a plugin interface:
- **OpenAI**: GPT-4, GPT-4o-mini
- **Anthropic**: Claude 3.5 Sonnet, Haiku
- **Mock**: For testing and fallback

### Routing Policy
The `DefaultRoutingPolicy` selects the best model based on:
- **Risk Level**: High risk flows get stronger models (GPT-4o, Claude 3.5 Sonnet).
- **Purpose**: Summarization/Classification gets cheaper models (GPT-4o-mini, Haiku).
- **Cost Budget**: Checks `maxCostUsd` if provided.

### Prompt Catalog
Prompts are versioned and stored in the `PromptRegistry`. Use `PromptService` to render them.

```typescript
const { messages } = await promptService.render('rag.answer', {
    context: '...',
    question: '...'
});
```

### Agents & Tools
The `AgentRunner` executes multi-step workflows using tools defined in `ToolRegistry`.
- **Retrieval Tool**: Search knowledge base.
- **Safe Execution**: All tool calls are vetted.

### Safety & Metering
- **SafetyPipeline**: Checks for prompt injections and enforces tenant policies.
- **QuotaManager**: Enforces rate limits and budgets per tenant.

## Integration Guide

To add a new LLM feature:
1. **Define a Prompt**: Add a template to `server/src/llm/prompts/registry.ts`.
2. **Use the Orchestrator**: Call `orchestrator.chat()` instead of `fetch`.
3. **Register Tools**: If needed, add tools to `server/src/llm/tools/registry.ts`.
