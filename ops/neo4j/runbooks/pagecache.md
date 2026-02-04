# Runbook: Neo4j Page Cache Management

## Overview
The Neo4j Page Cache is the primary mechanism for keeping graph data and indexes in memory. For the GraphPerf path-query accelerator, maintaining a high hit ratio is critical.

## Key Metrics to Monitor
- `neo4j.page_cache.hit_ratio`: Target >= 98%.
- `neo4j.page_cache.faults`: Number of times a page was not found in cache.
- `neo4j.page_cache.usage_ratio`: Percentage of the page cache currently in use.

## Diagnosing Performance Issues

### Symptom: Hit Ratio < 98%
If the hit ratio drops consistently below 98%:
1. **Check Cache Pressure**: If `usage_ratio` is near 100%, the page cache is likely undersized for the current dataset.
2. **Action**: Increase `server.memory.pagecache.size` in `neo4j.conf`.

### Symptom: High Faults on Startup
1. **Cold Cache**: Immediately after a restart, the cache is empty.
2. **Action**: Run the warmup suite in `tools/graphperf/runner.py` before enabling production traffic.

## Memory Sizing Guidance
- Total RAM = OS + Neo4j Heap + Neo4j Page Cache + Overhead.
- Page Cache should ideally be large enough to hold the entire database (including indexes).

## Rollback Procedure
If a memory configuration change causes instability:
1. Revert `server.memory.pagecache.size` to previous stable value.
2. Restart Neo4j.
3. Monitor for OOM (Out Of Memory) in Neo4j logs.
