# SWE Benchmark Operations Runbook

**SLO:** 99% deterministic execution

## Alert triggers

* task failure rate > 20%
* docker build failure

## Monitoring job

Executed via: `scripts/monitoring/swe-benchmark-health.ts`
