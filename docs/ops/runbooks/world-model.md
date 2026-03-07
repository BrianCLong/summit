# World Model Operational Runbook

## Overview

This runbook covers operational SLA, monitoring, and state divergence procedures for the World Model.

## SLA

- World-state read availability: 99.9%
- Replay freshness lag: under 5 minutes for near-real-time domains.

## Actions

- If drift is detected, check connector logs.
- Re-run state rebuilder.
