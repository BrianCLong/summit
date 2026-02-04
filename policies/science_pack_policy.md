# Science Pack Policy

## Overview
The Science Pack introduces new external datasets and foundation model adapters.
Due to the high risk of supply chain drift and license ambiguity, strict gates are applied.

## Gates

### 1. Provenance Lint
All manifests in `data/manifests/science/` must have:
- `license`
- `version_pin`

### 2. Dependency Delta
Any changes to `requirements.txt`, `poetry.lock`, or `package-lock.json` must be accompanied by an update to `docs/supply_chain/dependency_delta.md`.

### 3. Eval Budget
Scientific evaluations can be expensive. All eval runs are capped at:
- 10 minutes runtime
- 16GB RAM

## Exceptions
Exceptions to this policy must be recorded in `governance/exceptions.json`.
