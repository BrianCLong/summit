# 0004-region-sharding

## Status
Proposed

## Context
Enterprise buyers demand regional residency (US, EU, APAC) and the platform must deliver 99.5% latency compliance for tenant-critical queries. We need a strategy that balances resilience with controlled operational spend.

## Decision
Adopt a **hub-and-spoke regional sharding model**: a primary control plane region (us-east) plus active regional shards (eu-west, ap-southeast) for data storage and Kafka ingestion. Gateways route traffic to the tenant's home shard using latency-aware DNS while keeping management APIs centralized.

## SLO & Cost Trade-offs
- Cross-region replicas add ~$22k/year in infrastructure cost but cap cross-region latency to <250 ms p95 by eliminating transoceanic database hops.
- Centralized management APIs reduce headcount burden for SRE but may introduce 50 ms control-plane latency; mitigated by CDN caching for metadata reads.

## Consequences
- Requires asynchronous replication pipelines and reconciliation for Neo4j graph projections.
- Operational playbooks must cover shard failover and compliance attestation per jurisdiction.

## Rollback Plan
- **Rollback if** regional shard replication lag exceeds 5 minutes for two consecutive intervals, breaching RPO commitments.
- Collapse affected tenant traffic back into the primary region by updating routing policies and pausing shard-specific ingest until replication stability returns.
