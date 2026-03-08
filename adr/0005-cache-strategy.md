# 0005-cache-strategy

## Status
Proposed

## Context
GraphQL workloads mix low-latency metadata reads with authorization checks and graph traversals. We require a cache design that improves read SLOs without violating tenant isolation or stale-read tolerances (<=60 s for non-critical data).

## Decision
Use **Redis Cluster** as a tiered cache: (1) request-response caching at the gateway for idempotent queries, (2) policy decision memoization scoped by tenant and policy bundle version, and (3) rate-limit counters. TTL defaults to 30 s for metadata, 5 s for policy results, with explicit cache bypass for write-after-read flows.

## SLO & Cost Trade-offs
- Redis cluster with three shards per region adds ~$6k/year but reduces p95 read latency by ~40% and offloads Postgres replicas by 25%.
- Short TTLs keep staleness budgets under control at the expense of cache hit ratio (~65%), which is acceptable for cost envelopes.

## Consequences
- Requires consistent tenant-scoped key naming and automated invalidation hooks triggered by Kafka events.
- Cache warming necessary for cold-start scenarios in offline/air-gapped deployments.

## Rollback Plan
- **Rollback if** Redis error rate exceeds 0.5% or contributes >50 ms additional latency during canary analysis, breaching read SLOs.
- Disable Redis usage via feature flag, reverting to direct database reads while scaling Postgres replicas to handle increased load.
