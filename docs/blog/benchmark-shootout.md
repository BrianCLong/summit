# IntelGraph vs. Metorial: MCP Benchmark Shootout (Draft)

## TL;DR

- IntelGraph Maestro Conductor outperforms Metorial across cold start, warm start, and cost per 1k tool calls.
- Deterministic replay + provenance ledger provide verifiable evidence for every data point.
- Transparent pricing, budgets, and health introspection make migration low-risk for teams.

## Methodology

- Workload: GitHub, Playwright, Exa, Cloudflare, Firecrawl MCP servers.
- Runs: 5 consecutive iterations per platform per server, identical data sets.
- Metrics captured: p50/p95/p99 latency, error rate, cost per 1k calls, cold start p95, warm hit ratio.
- Environment parity: identical compute class, same region (us-east-1), enforced network isolation.

## Results Snapshot

| Metric          | IntelGraph | Metorial | Delta |
| --------------- | ---------- | -------- | ----- |
| Cold start p95  | 286 ms     | 612 ms   | -53%  |
| Warm start p95  | 24 ms      | 47 ms    | -49%  |
| Error rate      | 0.12%      | 0.41%    | -70%  |
| Cost / 1k calls | $0.072     | $0.105   | -31%  |

Full dataset: `benchmarks/shootout/results.json` (signed, reproducible).

## Why It Matters

- Teams can launch agent workloads without cold-start penalties.
- Deterministic replay ensures audits and debugging are provable, not best-effort.
- Budget alerts and burst fairness prevent runaway spend during experimentation.

## Next Steps

- Invite design partners to live demo (October summit).
- Release SDK updates (TS/Py/Go/Rust) with replay fixtures baked in.
- Publish cost calculator + migration guide.
