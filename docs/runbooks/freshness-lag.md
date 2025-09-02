# Freshness Lag Runbook

- Symptom: `PipelineFreshnessDegraded` alert or rising freshness seconds chart.
- Indicators: `pipeline_freshness_seconds`, queue depths, source API latencies.
- Possible causes: source backpressure, throttling, connector rate limits, slow transforms.
- Immediate actions:
  - Inspect per-pipeline freshness panels and worker CPU/memory.
  - Check source API health and rate limits.
  - Review recent code changes impacting transforms.
- Resolution steps:
  - Scale concurrency/replicas; adjust batch sizes.
  - Enable caching or prefetch for slow endpoints.
  - Optimize hotspots; roll back regressions.
- Validation: 95% freshness under 5 minutes over next 30–60 minutes.
