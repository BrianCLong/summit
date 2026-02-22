# Runbook: GGUF Inspection + Policy Mode (llama3pure-Inspired)

## Purpose

Operate the dependency-minimal GGUF inspection and policy checks for deterministic evidence.
This mode is intentionally constrained and aligned with the Summit Readiness Assertion.

## Commands

- Inspect metadata (deterministic report):
  - `summit gguf inspect --model <path> --out artifacts/gguf_report.json`
- RAM estimate (deterministic report):
  - `summit gguf ram-estimate --model <path> --context-size <n>`
- Policy check (fail closed):
  - `summit gguf policy-check --target web|node|native --model <path> --out artifacts/policy_report.json`

## Expected Artifacts

- `artifacts/gguf_report.json`
- `artifacts/policy_report.json`
- `artifacts/metrics.json`
- `artifacts/stamp.json`

All artifacts must be deterministic and contain hashes only (no timestamps).

## Failure Modes

| Symptom | Likely Cause | Action |
| --- | --- | --- |
| Policy check fails for web target | Model > 2GB | Use node/native target or smaller GGUF |
| OOM during inspect | Oversized tensor metadata | Enforce caps; reject model |
| Drift detected | Non-deterministic output | Verify canonicalization and hashing |

## SLO Assumptions

- Inspection mode is **best-effort**.
- Policy mode is **strict** and must fail closed.

## Rollback

- Disable GGUF inspection/policy feature flag.
- Remove new artifacts from evidence bundles if determinism is compromised.
