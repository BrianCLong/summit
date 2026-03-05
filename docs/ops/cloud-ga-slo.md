# Summit Cloud GA: Service Level Objectives (SLOs)

## Overview

This document defines the reliability targets and operational thresholds for the Summit Cloud GA release. These metrics act as automated release gates.

## Core SLOs

- **Availability Target**: 99.9% uptime for core API and data ingestion services.
- **API Latency Target**: 95th percentile (p95) response time under 250ms for standard requests.

## Error Budget Management

The error budget dictates the release cadence and incident response posture:

- **Calculation**: Based on a rolling 30-day window.
- **Enforcement**:
  - If error budget burn rate exceeds 2x the standard threshold, a mandatory feature freeze is enacted.
  - During a freeze, only reliability and critical security patches may be deployed.

## Incident Severity & Rollback

- **Automated Rollback**: Triggered automatically if the error rate exceeds 0.5% for a continuous 5-minute period during a release rollout (canary).
- **Incident Reporting**: All incidents breaching the error budget generate public RCA documentation and adjustments to reliability gating thresholds.
