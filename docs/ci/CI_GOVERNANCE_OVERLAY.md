---
title: CI Governance Overlay for GitHub
summary: Evidence-first CI/CD governance overlay with action pinning, workspace scanning, policy gates, and deterministic evidence packets.
owner: summit-governance
version: 1.0
lastUpdated: 2026-02-07
---

# CI Governance Overlay for GitHub

## Summit Readiness Assertion

This overlay is aligned to the Summit Readiness Assertion and enforces readiness posture through deterministic evidence and policy-first CI gates. See `docs/SUMMIT_READINESS_ASSERTION.md` for authoritative readiness requirements.

## Purpose

Establish a policy-first CI/CD overlay that hardens GitHub Actions and Codespaces execution surfaces, produces deterministic evidence packets, and enforces runner-resilience routing when hosted runners degrade.

## Scope

**In scope**

- GitHub Actions workflow controls (allowed actions, pinning, preflight scanning)
- Codespaces and workspace configuration scanning
- Deterministic CI evidence packet generation and verification
- Runner posture routing with degraded-mode safeguards

**Out of scope**

- Replacing GitHub Actions as the CI provider
- Introducing new secrets or credentials
- Directly mutating repository workflow files without policy review

## Overlay Architecture

### Evidence Packet (CI)

Every CI run emits a deterministic evidence packet:

- `report.json`: policy verdicts, rule versions, and surfaced findings
- `metrics.json`: pinning coverage, workspace surface score, queue time, drift
- `stamp.json`: input hashes, workflow ref, runner class, and schema versions

Evidence IDs follow:

```
EVID-YYYYMMDD-github-ci-<owner_repo>-<pr_or_sha>-<8hex>
```

### Policy Gates

1. **Actions pinning + allowlist**
   - Allow only approved actions, pinned by SHA.
2. **Workspace config scanning**
   - Detect repo-controlled execution vectors in `.devcontainer/`, `.vscode/`, and related config surfaces.
3. **Runner posture routing**
   - Route sensitive jobs to hardened self-hosted pools.
   - Fail closed or re-route during hosted-runner degradation.
4. **Evidence determinism**
   - Re-running with identical inputs yields byte-identical evidence packets.

### Overlay Execution Flow

1. Preflight scan (actions pinning + workspace config rules)
2. Policy verdict (OPA/rego or deterministic DSL)
3. Evidence packet emission (even on failure)
4. Runner posture capture and queue time telemetry

## Policy Inputs and Outputs

**Inputs**

- Workflow YAML
- `.devcontainer/` and `.vscode/` configs
- Actions lockfile or allowlist
- Runner metadata and queue time

**Outputs**

- Evidence packets stored under `out/evidence/<EVID>/`
- Policy verdicts and metrics added to CI artifacts
- Gate status surfaced to required checks

## Determinism Contract

- All evidence packet files are canonicalized (stable ordering, normalized timestamps).
- Policy evaluation uses explicit rule versions and frozen dependency hashes.
- Runner posture data is captured as structured metrics with explicit units.

## MAESTRO Security Alignment

**MAESTRO Layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security

**Threats Considered**

- Supply-chain substitution via unpinned actions
- Composite action privilege escalation
- Workspace RCE via devcontainer or VS Code config execution hooks
- Secret exfiltration via untrusted actions or workspace hooks
- Runner starvation causing partial or skipped gate execution

**Mitigations**

- Mandatory SHA pinning + allowlist enforcement
- Composite action approval policy with explicit pinning
- Workspace config scanner with deny/allow overrides
- Evidence packets emitted on failures to prevent silent skips
- Runner routing policy for sensitive jobs + degraded-mode fail-closed

## Assumptions & Validation Plan

- Codespaces execution vectors are detectable through config surface scanning and rule-driven matching.
- GitHub Actions organizational controls support enforcement of allowlists and pinning.
- Evidence packets can be stored and verified offline from CI artifacts.

Validation actions:

- Repro test: identical inputs must generate identical evidence hashes.
- Policy regression: seeded fixtures validate workspace and actions rules.
- Degraded-mode test: simulate runner queue spikes and validate routing behavior.

## Next Steps

- Implement evidence packet schema and deterministic packager.
- Add policy gates for action pinning and workspace config scanning.
- Introduce runner posture module and degraded-mode runbooks.

## See also

- `docs/ci/GOVERNANCE_GATES.md`
- `docs/ci/ACTIONS_PINNING.md`
- `docs/ci/EVIDENCE_COLLECTION.md`
- `docs/ci/REQUIRED_CHECKS.md`
