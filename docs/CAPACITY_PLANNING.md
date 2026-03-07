# Capacity Planning & Operating Envelopes

This document outlines the capacity limits, scaling inflection points, and cost signals for the Summit Agent Workloads.

## Workload Classes

1.  **Read-Only Queries**: High-volume, low-latency GraphQL queries.
2.  **Planning Jobs**: Compute-intensive, long-running agent planning tasks.
3.  **Write Actions**: Mutative operations with strict consistency requirements.

## Operating Envelopes

Based on load testing and resource quotas (`server/src/lib/resources/quota-manager.ts`), the following operating envelopes are defined:

| Tier           | Requests/Min (RPM) | Ingest Events/Min | Max Tokens/Req | Storage (GB) | Concurrent Seats |
| :------------- | :----------------- | :---------------- | :------------- | :----------- | :--------------- |
| **FREE**       | 20                 | 100               | 1,000          | 5            | 5                |
| **STARTER**    | 100                | 500               | 4,000          | 50           | 50               |
| **PRO**        | 1,000              | 5,000             | 16,000         | 250          | 150              |
| **ENTERPRISE** | 10,000             | 50,000            | 32,000         | 1,000        | 500              |

### Scaling Inflection Points

- **Database Connections**: PostgreSQL connection pool saturation occurs around 2000 concurrent active queries. Beyond this, `db_connections_active` metric spikes.
- **Memory Pressure**: Node.js heap usage (`application_memory_usage_bytes`) shows inflection at ~1.5GB per instance under heavy planning loads.
- **Rate Limiting**: The first line of defense is the application-layer rate limiter, which returns HTTP 429 when tier limits are exceeded.

## Cost Signals

Operators and automated scaling systems should monitor the following metrics to determine cost/performance trade-offs:

1.  **`rate_limit_exceeded_total`**:
    - **Signal**: High rate indicates under-provisioned tier or abusive traffic.
    - **Action**: Upsell to next tier or investigate abuse.

2.  **`maestro_job_execution_duration_seconds` (p95)**:
    - **Signal**: p95 > 5s for Planning jobs indicates compute bottleneck.
    - **Action**: Scale out Worker nodes.

3.  **`llm_tokens_total`**:
    - **Signal**: Direct correlation to external LLM costs.
    - **Action**: Optimize prompts or caching if growth is non-linear to revenue.

## Recommendations

- **Defaults**: Keep default quotas conservative (FREE tier) to prevent noisy neighbor issues.
- **Bursting**: Allow short bursts (token bucket algorithm) but enforce sustained limits strictly.
- **Regression Gates**: Ensure `k6/agent-slo-gate.js` passes in CI before deploying changes to critical paths.
