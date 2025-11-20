# Environment-Specific Test Automation

This guide explains how the new CI jobs validate the Summit Node.js and Python services across development (`dev`), staging, and production (`prod`) environments. The workflow runs automatically in GitHub Actions and can also be exercised locally for debugging.

## Overview

- **Workflow**: `.github/workflows/environment-specific-tests.yml` orchestrates environment-aware checks for both stacks.
- **Local orchestration**: Development and production checks run with Docker Compose, using lightweight utility containers that mount the repository.
- **Staging orchestration**: Staging checks run inside a disposable Kubernetes (Kind) cluster to mimic the platform deployment topology.
- **Synthetic data coverage**: Shared JSON fixtures (`scripts/tests/data/synthetic-test-data.json`) describe expected behaviour for each environment, enabling deterministic assertions.

## GitHub Actions workflow

The workflow fan-outs over the matrix `{dev, staging, prod} × {node, python}` and executes the scripts below. Highlights:

1. `dev` and `prod` jobs call Docker Compose via `scripts/tests/run_local_env_tests.sh`, which in turn launches either `node:20-alpine` or `python:3.11-slim` to run the synthetic checks.
2. `staging` jobs bootstrap a Kind cluster and call `scripts/tests/run_k8s_env_tests.sh`. The script packages the test artefacts in a ConfigMap and creates a Kubernetes `Job` to run the validations in-cluster.
3. All jobs rely on `scripts/tests/run_env_tests.sh` for a common entry point, making it straightforward to reproduce the CI behaviour locally.

## Synthetic test coverage

Synthetic fixtures assert environment guarantees for both service types:

- **Node.js** (`scripts/tests/run_node_tests.mjs`)
  - Validates schema version consistency for dev/staging/prod inputs.
  - Enforces latency budgets that tighten progressively from dev (150 ms) to prod (90 ms).
  - Ensures experimental feature flags are stripped from production samples while required feature flags remain enabled in dev/staging.
- **Python** (`scripts/tests/run_python_tests.py`)
  - Verifies anomaly counts stay below environment-specific thresholds.
  - Checks minimum confidence levels (0.6→0.9) and positive synthetic event counts.
  - Guards production coverage by requiring ≥10 synthetic events.

## Running the checks locally

```bash
# Dev Node.js checks (Docker Compose)
scripts/tests/run_env_tests.sh dev node

# Prod Python checks (Docker Compose)
scripts/tests/run_env_tests.sh prod python

# Staging Node.js checks (requires a running Kubernetes cluster, e.g. Kind)
scripts/tests/run_env_tests.sh staging node
```

For staging runs you need `kubectl` access to a cluster. Locally you can create one with [Kind](https://kind.sigs.k8s.io/), or rely on the GitHub Actions automation which uses the `helm/kind-action` setup.

## Artefact reference

| Artefact | Purpose |
| --- | --- |
| `docker-compose.env-tests.yml` | Defines the Docker Compose services used for dev/prod synthetic checks. |
| `scripts/tests/run_env_tests.sh` | Unified entry point that selects Docker Compose or Kubernetes orchestration. |
| `scripts/tests/run_local_env_tests.sh` | Handles Docker Compose orchestration for Node.js/Python containers. |
| `scripts/tests/run_k8s_env_tests.sh` | Creates the staging Kubernetes job and streams its logs. |
| `scripts/tests/run_node_tests.mjs` | Node.js synthetic assertions executed in both Docker Compose and Kubernetes flows. |
| `scripts/tests/run_python_tests.py` | Python synthetic assertions executed in both Docker Compose and Kubernetes flows. |
| `scripts/tests/data/synthetic-test-data.json` | Shared dataset describing expected environment behaviour. |

