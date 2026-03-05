# Summit Subsumption Engine v2 Plan (Chief-Inspired, Clean-Room)

## 1) Executive direction

Build a provider-agnostic, deterministic, task-based workflow engine for large-repo LLM operations. The implementation stays clean-room and Summit-native (no vendor lock-in, no proprietary runtime dependency).

## 2) Repo-verified corrections (live inspection)

The initial proposal assumed a root Go layout (`/cmd`, `/internal`, `/pkg`). Current repo reality differs:

- Root is a polyglot monorepo with heavy pnpm/GitHub Actions usage.
- Root-level `cmd/` and `internal/` do **not** exist.
- Existing deterministic and governance checks already run in CI (`ci-core.yml`, `api-determinism-check.yml`, `pr-quality-gate.yml`, `policy-validate.yml`, `governance-policy-validation.yml`).
- Existing workflow-diff capability already exists in `ga-graphai/packages/workflow-diff-engine/` and should be treated as adjacent capability, not replaced.

## 3) Minimal Winning Slice (MWS)

### MWS statement

A new Summit workflow package can execute a 3-task YAML DAG and emit deterministic artifacts:

- `report.json`
- `metrics.json`
- `stamp.json`

All artifacts are reproducible across three local runs and enforce policy + threat checks in CI.

### Determinism contract

- Canonical JSON serialization for all evidence artifacts.
- No wall-clock fields in deterministic outputs.
- Stable SHA-256 digest over canonical artifacts.

## 4) Tightened implementation placement

Use monorepo-native TypeScript package placement rather than root Go layout.

### Proposed additions

- `packages/summit-workflow-engine/src/schema.ts`
- `packages/summit-workflow-engine/src/dag.ts`
- `packages/summit-workflow-engine/src/executor.ts`
- `packages/summit-workflow-engine/src/provider.ts`
- `packages/summit-workflow-engine/src/policy.ts`
- `packages/summit-workflow-engine/src/cli.ts`
- `packages/summit-workflow-engine/test/*.test.ts`
- `docs/standards/chief-inspired-workflows.md`
- `docs/security/data-handling/workflow-engine.md`
- `docs/ops/runbooks/workflow-engine.md`
- `scripts/monitoring/workflow-drift-detector.sh`

### Must not modify

- Existing evidence schema contracts in governance docs unless explicitly versioned.
- Existing CI gate names; add a new workflow and wire it into existing required checks list without renaming incumbents.
- Existing policy engine semantics; only consume via adapter interfaces.

## 5) PR stack (max 5)

1. **feat(workflow): schema + DAG validator**
2. **feat(workflow): deterministic executor + artifact emitter**
3. **feat(ai): provider adapter + policy guard**
4. **feat(ci): workflow-engine gate and deterministic replay checks**
5. **docs(chief-inspired): standards + security + ops runbooks + drift monitor script**

## 6) CI integration targets (existing names retained)

Integrate with current CI surface by adding a focused workflow (e.g. `workflow-engine.yml`) while preserving incumbent jobs:

- `pr-quality-gate.yml`
- `ci-core.yml`
- `policy-validate.yml`
- `governance-policy-validation.yml`
- `api-determinism-check.yml`

## 7) Threat-informed constraints

- Prompt injection: static sanitization + policy denials.
- Data exfiltration: provider network allowlist and CI default mock provider.
- Non-determinism: 3-run replay hash comparison gate.
- Policy drift: scheduled drift monitor with diff artifact.

## 8) MAESTRO alignment

- **MAESTRO Layers**: Agents, Tools, Observability, Security.
- **Threats Considered**: Prompt injection, tool abuse, nondeterministic artifact mutation, egress misuse.
- **Mitigations**: policy-as-code guard, deterministic canonicalization, provider sandbox, evidence hashing and drift alerts.

## 9) Definition of done

- MWS command succeeds deterministically across 3 runs.
- CI gate proves replay determinism and policy enforcement.
- Docs and runbook published with operational rollback and alert triggers.
- Feature flag defaults OFF (`SUMMIT_WORKFLOW_ENABLED=false`).
