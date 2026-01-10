# Agent Context Management

This module introduces configurable context management strategies for Summit agents that balance cost, context retention, and trajectory safety. It supports masking, summarization, and a hybrid of both with token-aware triggers.

## Strategies

### Masking (default)

- Preserves reasoning and action text verbatim.
- Masks observations older than the configured window with `[OMITTED_OBSERVATION: too old; available in memory store]`.
- Uses a rolling window (default: 10 recent turns) while keeping the full-fidelity timeline persisted.

### Summarization

- Summarizes older turns into a running summary while keeping the newest turns verbatim.
- Intended for constrained contexts; use sparingly because summary calls add cost and can elongate trajectories.

### Hybrid

- Always masks older observations first.
- Triggers summarization when token budgets are exceeded or after a threshold of turns since the last summary.
- Keeps the latest turns verbatim and retains the durable raw history.

## Tuning knobs

- `tokenBudget`: total tokens allowed for the request.
- `reservedForResponse`: portion reserved for the model response (default 1000 tokens).
- `maxContextPct`: maximum fraction of the budget used for context (default 0.85).
- `maskingWindow`: number of most recent turns to include without masking (default 10).
- `summarizationTurnThreshold` and `summarizationTokenThreshold`: hybrid/summarization triggers.
- `summaryMaxTokens`: safety cap for summaries returned by the summarizer.
- `maxTurns` and `maxCostUsd`: hard stops to prevent runaway trajectories.
- `plateauWindow`: count of consecutive failed/no-progress turns that emits a stop hint.

Tune per agent scaffold: a fast chat agent may use a smaller masking window and aggressive `reservedForResponse`, while a deep code agent benefits from a larger window and higher thresholds before summarization.

## Telemetry

Each `buildPromptContext` call returns diagnostics with token estimates, masking counts, summary calls, and stop heuristics. Maestro logs the diagnostics and emits metrics:

- `agent_context_tokens_in`, `agent_context_tokens_out`
- `agent_context_masked_observation_tokens`
- `agent_context_summary_tokens`, `agent_context_summary_calls_total`
- `agent_context_estimated_cost_usd`
- `agent_context_turn_count`

## Persistence

Summit persists every raw turn to PostgreSQL (table: `agent_context_turns`) through the context persistence adapter. This guarantees full-fidelity audit trails even when observations are masked or summarized in the prompt context.

## Enabling in Summit

- Configure the strategy via `AGENT_CONTEXT_STRATEGY=masking|summarization|hybrid` (default `masking`).
- The Maestro LLM service uses the context manager when assembling messages and emits diagnostics per request.
- Raw turns are persisted to `agent_context_turns` for auditability.
- Tooling integrations should tag large tool outputs as `observation.type=tool_output` to ensure masking targets high-cost observations.

### Example configurations

- **Fast chat agent**: `AGENT_CONTEXT_STRATEGY=masking`, `AGENT_CONTEXT_MASKING_WINDOW=6`, `AGENT_CONTEXT_RESERVED=1800`, `AGENT_CONTEXT_SUMMARY_TURNS=18`.
- **Deep code agent**: `AGENT_CONTEXT_STRATEGY=hybrid`, `AGENT_CONTEXT_MASKING_WINDOW=12`, `AGENT_CONTEXT_SUMMARY_TURNS=10`, `AGENT_CONTEXT_SUMMARY_TOKENS=9000`, `AGENT_CONTEXT_MAX_TURNS=120`.
