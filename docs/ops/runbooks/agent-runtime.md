# Agent Runtime Runbook

## Overview
This runbook covers the operational readiness for the new Summit Agentic Runtime, focusing on governance-first execution.

## SLO Assumptions
* Latency: <150ms orchestration overhead per tool invocation
* Memory: <50MB incremental usage
* Reliability: 99.9% uptime for core execution path

## Incident Response Playbook
1. **Symptom**: Agent is hanging or policy denial rates spike.
2. **Investigation**:
   * Check metrics for `summit_agent_latency`.
   * Check feature flags. If isolated bug, turn off `SUMMIT_ENABLE_AGENT_RUNTIME`.
   * Review policy violation logs in Datadog/Splunk.
3. **Mitigation**:
   * If root cause is a bad policy rule deployment, revert the PR containing the policy change.
   * If root cause is unknown, toggle feature flag off.

## Rollback / Blast Radius
* The feature flag defaults to `OFF`.
* Rollback is achieved by simply disabling the feature flag or reverting the PR stack sequentially.
* Does not affect the core data pipeline if turned off.
