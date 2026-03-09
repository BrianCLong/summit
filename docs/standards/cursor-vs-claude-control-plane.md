# Summit Standard: Cursor vs Claude Code Subsumption via Proof-Carrying PRs

## Summit Readiness Assertion
Summit does not choose between IDE-native copilots and autonomous coding agents. Summit governs both through one control plane that emits deterministic, machine-verifiable evidence before merge.

## Purpose
This standard translates the workflow pattern from "Cursor vs Claude Code" into Summit implementation guidance.

- **Interactive Assist mode** preserves fast human-in-the-loop editing.
- **Autonomous Execution mode** preserves broad multi-file automation.
- **Orchestrated mode** enforces deterministic plans, bounded blast radius, and policy verdicts.

## Three Missing Features Required for Subsumption

### 1) Deterministic Repo State Model (RSG)
Create a canonical `RepoState` substrate so agents operate on structured repository state instead of implicit buffer + shell context.

**Required outputs**
- `artifacts/repo_state/state.json`
- deterministic file/dependency/test/policy graph snapshots

**Acceptance criteria**
- Re-running state extraction on the same commit yields byte-stable output.
- Impact analysis consumes `RepoState` instead of direct ad-hoc filesystem traversal.

### 2) Agent Plan Compiler
Compile natural-language tasks into a typed deterministic plan before any edit is executed.

**Required outputs**
- `artifacts/agent/plan.json`
- `artifacts/agent/patch.diff`
- `artifacts/agent/metrics.json`

**Acceptance criteria**
- Plan schema validates in CI.
- Every action in `plan.json` maps to an allowed operation and bounded path scope.

### 3) Repo Governance Layer
Gate all AI-generated diffs with deny-by-default policy rules and explicit verdict artifacts.

**Required outputs**
- `artifacts/policy/report.json`

**Acceptance criteria**
- Prohibited path edits fail.
- Secret-like diff patterns fail.
- Executable code edits without mapped tests fail.

## Killer Feature: Proof-Carrying PRs (PCPR)
A PR becomes merge-eligible only when it carries a machine-checkable proof packet:

1. typed plan
2. impact map
3. threat contract
4. policy verdict
5. merge simulation verdict
6. rollback contract
7. deterministic evidence bundle

This is Summit's defensible position as the control plane for AI developers.

## MAESTRO Alignment
- **MAESTRO Layers**: Agents, Tools, Security, Observability, Infra.
- **Threats Considered**: prompt injection, unsafe diff expansion, secret leakage, policy bypass.
- **Mitigations**: deterministic plan compilation, deny-by-default policy gates, required evidence bundle artifacts, rollback contract.

## Minimal Winning Slice (MWS)
Implement `summit prove-pr` to transform a bounded task into a deterministic governance packet.

```bash
summit prove-pr --task "add retry budget to ingest client" --scope api,agents
```

Expected artifacts:
- `artifacts/prove_pr/<run-id>/plan.json`
- `artifacts/prove_pr/<run-id>/impact.json`
- `artifacts/prove_pr/<run-id>/policy.json`
- `artifacts/prove_pr/<run-id>/threats.json`
- `artifacts/prove_pr/<run-id>/rollback.json`
- `artifacts/prove_pr/<run-id>/report.json`
- `artifacts/prove_pr/<run-id>/metrics.json`
- `artifacts/prove_pr/<run-id>/stamp.json`

## PR Stack (Hard Stop: 5)
1. `feat(prove-pr): CLI + schemas`
2. `feat(prove-pr): impact mapper + blast radius`
3. `feat(policy): prove-pr rego controls`
4. `feat(ci): merge simulation + artifact verification`
5. `docs(standards): operating workflow + runbooks`

## Governance Constraints
- Policy bypass is prohibited.
- Sensitive paths are deny-by-default unless explicitly allowlisted.
- Deterministic artifacts must be timestamp-free except `stamp.json`.
- Rollback plan is mandatory for merge eligibility.

## Finality
Summit subsumes both paradigms by making AI-authored changes provable, governable, and reversible.
