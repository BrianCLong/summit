# Runbook: Narrative Intelligence Service

## Overview
The Narrative Intelligence service extracts structural invariants from text to detect influence operations.

## Metrics to Watch
- `narint_extraction_latency_ms`: P95 should be < 500ms.
- `narint_error_rate`: Should be < 1%.
- `narint_cluster_churn`: High churn indicates unstable fingerprints.

## Alerts

### High Error Rate
- **Trigger**: Error rate > 5% for 5 mins.
- **Action**: Check logs for model OOMs or ingestion format changes.
- **Rollback**: If caused by new deployment, revert using `helm rollback`.

### High Latency
- **Trigger**: P95 > 1s for 5 mins.
- **Action**: Scale up `extract-worker` replicas. Check database CPU.

## Degraded Modes
- **Model Service Unavailable**: Service will return 503 for extraction. Clustering can still run on cached skeletons.
- **Graph DB Unavailable**: Service will queue writes. Reads will be served from cache or fail.

## Disaster Recovery
- **Data Loss**: Restore from Postgres PITR backup. Rebuild Graph from Skeletons using `scripts/rebuild_graph.py`.
