# Task 19016 — Frontier Closure (Active PR Wave)

## Objective

Shrink the active PR frontier with minimal risk and maximum merge throughput by closing bounded PRs, resolving overlap, and converting umbrella work into narrowly scoped residuals.

## Scope

Primary PR wave:
- `#19016`–`#19029`

Fast-track candidates:
- `#19011`–`#19015` when independently mergeable

## Success Criteria

1. Frontier count materially reduced (merged or queued with auto-merge where appropriate).
2. `#19016` no longer acts as an uncontrolled umbrella; it is merged narrowly or explicitly converted into a human decision point.
3. Duplicate workflow/check/artifact ownership resolved across GA/CI/evidence PRs.
4. Remaining blockers are explicit, human-actionable, and minimal.
5. Approval churn minimized (metadata/doc-only fixes preferred when possible).

## Non-Negotiables

- Preserve approvals whenever possible.
- Smallest patch to unblock.
- Never claim green CI/checks if not verified.
- No unrelated refactors/style churn.
- Respect protected branch requirements and merge queue constraints.

## Execution Plan

### 1) Build frontier matrix
For each target PR, capture:
- title, scope size, mergeability, required checks, approvals, conflicts, overlap/deps, recommended action, confidence.

### 2) Sequence merges for throughput
Bias order:
1. independent small fixes,
2. docs/workflow-bounded GA PRs,
3. medium GA PRs with clear ownership,
4. umbrella residual,
5. agent/intel architecture stack.

### 3) Handle #19016 as umbrella
Decide one:
- merge as-is,
- minimal patch and queue,
- narrow/restack (default),
- explicit human gate.

### 4) Resolve GA overlap
Explicitly assign single owners for:
- required checks,
- evidence generation,
- provenance/SBOM/OpenLineage output names,
- workflow triggers/path filters,
- deterministic artifacts.

### 5) Fast-track bounded PRs
Prioritize:
- `#19017`, `#19022`, `#19023`, `#19024`, `#19020`

### 6) De-risk agent/intel cluster
Dependency stack hypothesis:
- `#19029` before `#19027`
- `#19028` before `#19026`
- `#19025` before `#19027` if graph reconciliation is prerequisite

### 7) Finalize handoff
Output sections:
1. Merged/queued/auto-merge enabled
2. Patched and awaiting checks
3. Ready for human approval
4. Needs restack/split/supersession
5. Blocked by policy/review/infra
6. Exact next human actions
7. Why this order minimizes risk

## Evidence Requirements

- Store matrix + sequencing decisions in `artifacts/frontier-closure-YYYY-MM-DD.md`.
- Include exact commands used and outcomes.
- If environment blocks live GitHub checks, label fields as `unverified` and escalate explicitly.
