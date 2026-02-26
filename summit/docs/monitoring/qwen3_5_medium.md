# Qwen3.5 Medium Drift Monitoring

This document describes the monitoring strategy for Alibaba's Qwen3.5 Medium model within the Summit ecosystem.

## Overview

We monitor Qwen3.5 Medium to ensure it maintains its performance claims (comparable to Claude Sonnet 4.5) and cost-efficiency.

## Key Metrics

* **Accuracy**: Monitored via the standard Summit evaluation harness.
* **P95 Latency**: Tracked per evaluation run.
* **Cost per 1K Tokens**: Calculated based on usage reports and known pricing.

## Drift Detection

The drift detector (`summit/scripts/monitoring/qwen3_5_drift.py`) compares new evaluation results against a recorded baseline.
A drift is flagged if:
- Accuracy drops by > 5%.
- P95 Latency increases by > 5%.

## Alerts

Alerts are sent to the #model-ops Slack channel if drift is detected in the weekly scheduled evaluation job.
