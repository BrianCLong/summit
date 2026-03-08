# Agent Supermux Runbook

## Overview
Runbook for dealing with Supermux incidents and operations.

## Operations
- **Orphaned Sessions:** Use `summit supermux down` to cleanup.
- **Artifact Pruning:** Use `summit supermux prune` to drop old events and streams.
- **Drift:** Check replay checksums against `events.jsonl`.
