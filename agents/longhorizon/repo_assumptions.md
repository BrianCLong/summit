# Repository Assumptions — LongHorizon PR-Chains Track (PR-Chain / LongHorizon)

Owner: Platform Engineering (LongHorizon Track)
Last-Reviewed: 2026-02-25
Evidence-IDs: LONGHORIZON.REPO_ASSUMPTIONS.V1
Status: draft

## 0. Scope and Intent

**Scope:** Subsumption of PR-chain grounded long-horizon evaluation (daVinci-Agency inspired) into Summit, with deterministic artifacts and Golden Path governance.

**Intent:** This document is an explicit contract for “what we assume is true about the repo” so the PR-stack can be built atomically without accidentally violating Golden Path gates.

**Non-Goals:**

- Defining model quality targets (that belongs in evaluator spec + benchmarks).
- Redefining Summit’s governance gates (we integrate; we do not weaken).

**Feature Flag:** LONGHORIZON_PR_CHAINS_ENABLED=false (default OFF)

- Must be implemented in the canonical feature-flag mechanism used by Summit (not ad-hoc env flags).

---

## 1. Canonical Repo & CI Invariants

This section distinguishes **Verified** vs **Assumed**. “Verified” means confirmed by repo policy/workflows; “Assumed” means we must inspect codepaths before merging.

| Area | Verified | Assumed | Notes |
| --- | --- | --- | --- |
| Package manager | ✅ | ☐ | pnpm workspace; pnpm version pinned via root `packageManager` |
| Workspace topology | ✅ | ☐ | `pnpm-workspace.yaml` includes `agents/*`, `packages/*`, `services/*`, `client`, `server`, `cli` |
| TypeScript baseline | ✅ | ☐ | Root `tsconfig.json` extends base + uses project references |
| Agents placement | ✅ | ☐ | `agents/*` is a first-class workspace target |
| Streaming ingest service | ✅ | ☐ | `services/streaming-ingest` exists (candidate home for PR-chain ingestion hooks) |
| Artifact root | ✅ | ☐ | `artifacts/` exists and is scanned by CI safety rails |
| CI PR workflow | ✅ | ☐ | `.github/workflows/ci-pr.yml` is the core PR pipeline |
| CI security workflow | ✅ | ☐ | `.github/workflows/ci-security.yml` exists and runs multi-tool scans |
| Deterministic build gate | ✅ | ☐ | ci-pr includes a “build twice + checksum diff” determinism job |
| Required checks policy | ✅ | ☐ | `docs/ci/REQUIRED_CHECKS_POLICY.yml` is the canonical source of required contexts |
| Branch protection drift detection | ✅ | ☐ | Drift check script exists and emits governance artifacts/evidence |
| Evidence ID policy | ✅ | ☐ | `docs/governance/EVIDENCE_ID_POLICY.yml` defines required headers + evidence map path |
| Evidence map file existence | ☐ | ✅ | Policy points to `evidence/map.yml` but path must be confirmed in-repo |
| Never-log enforcement | ✅ | ☐ | CI runs “never-log scan” against `artifacts/` and `logs/` |
| Evidence determinism scan | ✅ | ☐ | CI runs a timestamp/key heuristic scan under `artifacts/evidence/*.json` |
| Policy-as-code framework | ✅ | ☐ | CI security suite includes OPA/Conftest validation (policy directory must be respected) |

**Implication:** LongHorizon must integrate with **existing** determinism/never-log/policy-as-code gates, not bypass them.

---

## 2. LongHorizon Module — Proposed Placement (Assumption)

Because `agents/*` is a workspace target, the safest initial landing zone is:

```text
agents/
longhorizon/
package.json
src/
schema/
builder/
evaluator/
policies/
fixtures/
```

**Notes:**

- Avoid introducing a new top-level taxonomy unless necessary.
- If LongHorizon needs to be a library consumed by multiple services, consider a follow-on move into `packages/` after the first green PR stack.

---

## 3. PR-Chain Ingestion — Integration Targets (Assumption)

Candidate integration points (must be verified before PR2/PR3):

- `services/streaming-ingest/` (preferred): treat PR-chain JSONL as *data events*, not executable code.
- `services/graph-core/` or provenance ledger service: store normalized PR-chain records with content-addressed IDs.

**Hard requirement:** PR diffs/patches are treated strictly as inert data (no tool execution during evaluation).

---

## 4. Deterministic Artifact + Evidence Contract (Governance-Aligned)

### 4.1 Artifact folder contract (LongHorizon output)

LongHorizon evaluator emits:

```text
artifacts/longhorizon/<EVIDENCE_ID>/
report.json        # deterministic
metrics.json       # deterministic
inputs.json        # deterministic (redacted, normalized)
stamp.json         # runtime metadata ONLY
```

Deterministic file rules:

- No wall-clock timestamps.
- Stable key ordering (deep-sort) and stable formatting.
- Content-hash-derived `EVIDENCE_ID` (or policy-approved deterministic derivation).
- Paths inside artifacts must be repo-relative, normalized to `/`.

Runtime file rules (`stamp.json`):

- May include timestamps, machine metadata, CI run IDs, etc.
- Must never be used as an input to deterministic hashes.

### 4.2 Evidence file (optional but recommended for gate integration)

To integrate with existing evidence determinism scans, emit an additional *small* evidence summary:

```text
artifacts/evidence/longhorizon.<SHA>.json
```

Constraints:

- Must pass the repo’s “evidence determinism” scan (no unstable timestamps in keys like `*at`, `*time`, `*timestamp`).
- Should include:
  - gate name: `longhorizon-prchains`
  - sha
  - verdict
  - content_hash (deterministic)
  - references: list of produced artifact paths and their sha256 checksums

---

## 5. Security & Safety Model (Must-Hold Constraints)

### 5.1 Never-log and secret hygiene (Verified gate)

Because CI scans `artifacts/` and `logs/`, LongHorizon artifacts MUST:

- Store only redacted excerpts (no tokens/secrets/credentials).
- Avoid embedding strings that look like key/value secrets (even in examples).
- Provide a deterministic redaction policy (pattern + allowlist + test fixtures).

### 5.2 Tool execution policy (Assumed integration)

- Default: deny-by-default tool allowlist during evaluation.
- Evaluation must not run external network calls unless explicitly whitelisted and deterministically recorded (prefer “OFF in CI”).

### 5.3 Policy-as-code compatibility (Verified gate exists)

- Any new policy or security logic must not conflict with existing OPA/Conftest rules.
- If LongHorizon introduces new artifact types, update policy rules additively.

---

## 6. Performance Budgets (Initial)

Budgets are CI-enforced targets; violations should fail CI unless a local-only override is used.

| Metric | Budget |
| --- | --- |
| Runtime per fixture | ≤ 60s |
| Memory | ≤ 1.5GB |
| Tool call cap | 150 |
| Determinism re-run delta | 0 bytes (deterministic files) |

---

## 7. Governance Alignment (Golden Path)

### 7.1 Required checks are policy-defined

Required contexts and required workflows are enumerated in `docs/ci/REQUIRED_CHECKS_POLICY.yml`.
LongHorizon PRs must:

- Not reduce required checks.
- Not weaken workflows named in policy.
- Keep changes additive and scoped.

### 7.2 Branch protection drift is actively checked

If LongHorizon changes required checks policy or introduces new required contexts:

- Ensure drift detection is updated accordingly.
- Ensure any automation that syncs policy to GitHub is not broken.

### 7.3 PR stack constraints

- PR stack capped at 6, each independently mergeable.
- No modifications to shared workflow templates unless verified end-to-end.
- Default flag OFF throughout the stack until final activation PR.

---

## 8. Open Verification Tasks (Reconciliation TODO)

### A. Repo structure

- [ ] Confirm whether any existing “evaluation harness” already exists for agent regression testing.
- [ ] Confirm canonical location for fixtures/golden files (avoid creating a new convention).

### B. CI & checks

- [ ] Confirm which workflow produces the required “Unit Tests” context referenced by policy.
- [ ] Confirm LongHorizon evidence summary placement passes existing determinism scans.

### C. Evidence model alignment

- [ ] Confirm the actual evidence map file path and registry mechanism (policy references `evidence/map.yml`).
- [ ] Confirm preferred `EVIDENCE_ID` derivation pattern for artifacts (content hash vs policy registry).

### D. Security & policy

- [ ] Confirm redaction utilities already exist and can be reused.
- [ ] Confirm OPA policy directories and required coverage thresholds for policy tests.

### E. Monitoring & drift

- [ ] Identify the canonical scheduled workflow pattern for drift detection and how LongHorizon adds metrics safely.

### F. Dataset license & redistribution

- [ ] Confirm daVinci-Agency upstream license (repo + dataset) and record evidence.
- [ ] Confirm whether redistributed PR-chain content contains code fragments with additional upstream repo licenses.
- [ ] Add attribution/citation files if required.

---

## 9. Risk Register (Pre-Merge)

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Non-deterministic artifacts | High | Add deterministic re-run checks; deep-sort JSON; enforce byte-compare |
| Secret leakage in excerpts | Critical | Redaction + never-log compliance tests + CI scan |
| Policy/check drift | Medium | Keep REQUIRED_CHECKS_POLICY changes isolated; validate drift tooling |
| Evidence map mismatch | Medium | Verify registry path early; don’t ship broken gate wiring |
| Budget overrun | Low | CI runtime enforcement + fixture sampling |

---

## 10. Merge Readiness Criteria

LongHorizon becomes merge-eligible when:

- Determinism passes 2× byte compare on deterministic outputs
- Never-log scan passes with LongHorizon artifacts present
- CI security suite returns zero critical findings for touched paths
- Feature flag remains default OFF
- Golden fixture tests are green
- No branch protection drift is introduced
- Evidence contract is validated against Evidence-ID policy and required check policy

---

## 11. Current Status

All non-Verified items remain **Assumed** pending targeted repository inspection and CI confirmation.
