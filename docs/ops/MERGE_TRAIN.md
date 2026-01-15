# Merge Train Operations

## Overview
This document outlines the operations for the Merge Train and Preflight checks, aiming to increase throughput and reduce conflict debt.

## Commands

### `make preflight`
Run local gates (lint, typecheck, test) to ensure code is ready for the merge train.

**Usage:**
```bash
make preflight
make preflight fast=true # Skip tests
```

### `make pr-queue`
Generate a triage report of the current PR queue. This helps identify high-priority PRs and conflicts.

**Usage:**
```bash
make pr-queue
```

### `make merge-train`
Simulate a merge train run for specific PRs. This validates that a set of PRs can be merged together without conflicts.

**Usage:**
```bash
make merge-train prs=123,456
```

## Recovery

If the merge train gets stuck or reports conflicts:
1. Run `make pr-queue` to identify conflicting PRs.
2. Use `make mt-triage` to label and notify authors of conflicts.
3. If a PR is blocking the train, it should be removed from the queue or fixed immediately.
