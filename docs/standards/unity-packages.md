# Unity Package Governance Standard

Summit subsumes Unity-style package reuse by treating each `package.json` as a governed artifact.

## Inputs and Outputs

- Input: Unity `package.json` (+ optional `.asmdef` files)
- Output: deterministic `artifacts/package-report.json`, `artifacts/metrics.json`, `artifacts/stamp.json`

## Enforcement

- Strict SemVer for package and dependency versions.
- Scoped registry policy from `policies/registry_policy.yaml`.
- Deterministic dependency DAG generation.

## Evidence Identifier

`EVIDENCE:UNITYPKG:<package-name>:<version>`
