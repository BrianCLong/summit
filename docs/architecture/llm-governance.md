# LLM Governance and Routing

This document summarizes the governance controls around LLM usage in Summit. The goal is to make
every LLM call policy-governed, cost-bounded, observable, and resilient to abuse or prompt
exfiltration attempts.

## Components

- **Policy Store** (`config/llm-policy.yaml`, `server/src/llm/policy-store.ts`) — source of truth for
  allowed models, token ceilings, rate limits, and per-tenant cost caps.
- **LLM Router** (`server/src/llm/router.ts`) — deterministic routing engine that evaluates policy,
  applies guardrails, enforces cost ceilings, and selects a provider/model.
- **Cost Tracker** (`server/src/llm/cost-tracker.ts`) — per-tenant accounting for tokens and
  estimated USD burn with soft/hard enforcement.
- **Abuse Detector** (`server/src/llm/abuse-detector.ts`) — prompt size guard, repeated-failure
  detection, and suspicious-pattern flagging (e.g., system prompt extraction attempts).
- **Observability** (`server/src/observability/metrics/metrics.ts`) — emits `summit_llm_*` metrics
  for requests, latency, tokens, and policy denials.

## Routing Logic

1. **Policy Lookup**: Requests declare `tenantId`, `taskType` (`rag`, `summarization`, `extraction`,
   `agent`), `modelClass` (`fast`, `balanced`, `premium`, `cheap`), and `sensitivity`. The router
   resolves an applicable tenant/task/class policy; absence of a match is a hard deny.
2. **Guards**:
   - Prompt length limit (per-tenant) and token ceilings (per task/class) are enforced.
   - Per-tenant requests-per-minute are enforced with a sliding window.
   - Suspicious prompts (system prompt extraction, instruction overrides) raise structured security
     events; repeated failures trigger throttling.
3. **Cost-Aware Selection**:
   - Soft cap → emit warnings and downgrade to the cheapest allowed class.
   - Hard cap (projected or current) → deny with a clear error.
   - Provider candidates are filtered by allowed models, then ordered by routing policies (cost and
     latency).
4. **Execution & Fallback**: Providers are attempted in policy order with structured replay logging,
   caching, and guardrail validation before/after execution.

## Policy Configuration (`config/llm-policy.yaml`)

```yaml
version: 1
defaultTenant: default
tenants:
  <tenant-id>:
    monthlyCost:
      soft: <usd> # warning + downgrade when exceeded
      hard: <usd> # hard block when exceeded
    maxRequestsPerMinute: <int>
    promptLimit: <chars>
    abuse:
      failureThreshold: <int>
      windowSeconds: <int>
      suspiciousPatterns:
        - "(?i)system prompt"
    tasks:
      rag|summarization|extraction|agent:
        maxTokens: <tokens>
        modelClasses:
          fast|balanced|premium|cheap:
            maxTokens: <tokens>
            allowedModels:
              - provider: openai
                model: gpt-4o-mini
```

The policy file is validated at startup; missing or malformed entries fail the GA gate.

## Cost Controls

- Per-tenant monthly accounting for prompt + completion tokens and estimated USD.
- Soft cap: warning + forced downgrade to cheaper model class.
- Hard cap: request is blocked before execution.
- Token ceilings are enforced from policy at both the task and class level.

## Abuse & Exfiltration Guards

- Prompt length limits to block oversized or smuggled payloads.
- Repeated failure detection per tenant (threshold/window) to curb brute-force probing.
- Regex-based suspicious pattern detection for prompt-exfiltration attempts; emits structured
  `llm_security_event` logs without relying on an external SIEM.

## Observability & GA Gate

- Metrics emitted via the central Prometheus registry:
  - `summit_llm_requests_total{provider,model,status,tenantId}`
  - `summit_llm_latency_seconds{provider,model}`
  - `summit_llm_tokens_total{provider,model,kind}`
- GA gate assertions (tests) fail if:
  - `config/llm-policy.yaml` is missing or invalid.
  - Requests attempt to bypass policy matching (deny-by-default).
  - Cost accounting hooks are absent for successful routes.
