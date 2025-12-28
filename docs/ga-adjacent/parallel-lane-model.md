# GA-Adjacent Parallel Lane Model (Frontend)

## A. GA-Adjacent Parallel Lane Specification

### Lane Definitions

| Lane  | Scope (frontend)                                            | Directory/namespace boundary  | Primary owner                   | Backup owner        |
| ----- | ----------------------------------------------------------- | ----------------------------- | ------------------------------- | ------------------- |
| GA-A1 | Experiments & instrumentation for GA-adjacent UX validation | `apps/web/src/lanes/ga-a1/**` | Frontend Velocity Systems Owner | FE Platform Lead    |
| GA-A2 | Workflow acceleration & triage surfaces                     | `apps/web/src/lanes/ga-a2/**` | GA-A2 Lane Owner                | Design Systems Lead |
| GA-A3 | Operator controls & auditability UI                         | `apps/web/src/lanes/ga-a3/**` | GA-A3 Lane Owner                | FE Reliability Lead |

### Ownership Model

- Each lane has a named **Primary Owner** and **Backup Owner**.
- All GA-adjacent work must declare a lane in the PR title (e.g., `GA-A2:` prefix) and in the PR body using the lane checklist.
- Lane owners are accountable for scope boundaries and contract compliance.

### Isolation Rules

**Code & ownership**

- Lane code must live in its dedicated boundary: `apps/web/src/lanes/<lane-id>/`.
- Cross-lane imports are forbidden without explicit written approval from both lane owners and the Frontend Velocity Systems Owner.
- Shared functionality must go through `apps/web/src/shared/ga-adjacent/` with a short design note in the PR.

**Review & approval**

- PRs require **two approvals**: lane owner + one independent reviewer from the Frontend Review Pool.
- Drive-by approvals are not allowed; reviewers must leave a checklist acknowledgement in the PR body.
- Escalation path: Lane Owner → Frontend Velocity Systems Owner → Product DRI.

**Semantic safety**

- GA-locked surfaces are defined in `apps/web/src/ga-locked/` and may not be modified by any lane without an explicit coordination note.
- Golden-path assertions are defined in `apps/web/src/contracts/golden-path/` and require a coordination note if touched by more than one lane in a sprint.
- Core copy/claims live in `apps/web/src/content/ga-core/` and are protected by CODEOWNERS.

### Review Requirements

- **Required reviewers per lane**:
  - GA-A1: Frontend Velocity Systems Owner + Frontend Review Pool member
  - GA-A2: GA-A2 Lane Owner + Frontend Review Pool member
  - GA-A3: GA-A3 Lane Owner + Frontend Review Pool member
- **Explicit PR metadata**:
  - Lane ID, risk tier, affected contracts, and rollback plan.
- **Contract visibility**:
  - Golden-path contract tests must be referenced in the PR description.

---

## B. Lane Operating Playbook

### Start a lane

1. Create a lane kickoff issue with: scope, boundaries, contracts impacted, risk tier.
2. Create a lane branch using `feat/ga-aX/<short-desc>`.
3. Ensure code lands in `apps/web/src/lanes/ga-aX/` with zero cross-lane imports.
4. Add PR checklist: lane ID, reviewers, contracts touched, rollback plan.

### Pause a lane

1. Add `lane-paused` label and stop new PRs in that lane.
2. Freeze merges for the lane; move WIP PRs to draft.
3. Document pause reason in `docs/ga-adjacent/parallel-lane-model.md` changelog entry.

### Close or merge a lane

1. Validate golden-path contract tests for the lane.
2. Confirm no pending cross-lane approvals.
3. Merge PRs in sequence (see merge rules below).
4. Archive lane-specific toggles or flags; document in the PR.

### Conflict resolution

1. Detect conflicts via CI or review notes.
2. If two lanes target the same GA-locked surface, **pause the later lane** and escalate.
3. Rebase to resolve conflicts only after a coordination note is approved by both lane owners.

### Merge sequencing rules

- **Max concurrent GA-adjacent PRs**: 6 total.
- **Per-lane WIP limit**: 2 open PRs per lane.
- **Sequencing**:
  1. GA-locked surfaces first (if explicitly coordinated).
  2. Shared `ga-adjacent` utilities second.
  3. Lane-specific UI last.

---

## C. Velocity Scaling Memo

**Parallelism enablement**

- Lanes are isolated by directory boundary and ownership.
- Review load is distributed by named reviewers and per-lane WIP limits.
- Merge sequencing avoids collision on GA-locked surfaces.

**Risk bounds**

- Cross-lane imports are blocked unless explicitly approved.
- Golden-path contract tests remain authoritative and required for every lane PR.
- Each lane includes a rollback plan and a pause mechanism.

**GA trust preservation**

- Semantic safety is enforced via GA-locked boundaries and explicit coordination.
- CI reporting ties failures to a lane via lane-tagged workflows and PR metadata.
- Determinism is maintained by isolating workstreams and sequencing merges.

---

## CI & Contract Scaling Requirements

- Golden-path tests are mandatory; no lane can bypass shared CI gates.
- CI must label failures with the lane ID via PR metadata in the build summary.
- If CI time becomes a bottleneck, split by lane using targeted test selection without weakening coverage.

## Risk & Blast-Radius Management

- Lane failures are contained by feature flags scoped to `apps/web/src/lanes/<lane-id>/`.
- Pausing a lane requires disabling its flags and freezing merges.
- Unrelated lanes continue once the failing lane is isolated and flagged off.

## Changelog

- 2025-12-27: Initial GA-adjacent parallel lane model for frontend velocity.
