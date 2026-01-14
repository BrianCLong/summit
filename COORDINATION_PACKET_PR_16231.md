# Multi-Agent Coordination Packet: Closing PR #16231

**Status:** `ACTIVE`
**Target:** Merge PR #16231 (Evidence-ID Consistency Enforcement)
**Coordinator:** Jules

This packet defines the execution strategy to salvage, fix, and merge PR #16231. The primary goal is to establish a rigorous "Evidence-ID" consistency gate without introducing regression or false assurance.

## A) Workstream Decomposition

We will execute 6 sequential workstreams to bring this feature to "Golden Path" quality.

*   **W1: Reality verification & diff audit**
    *   **Goal:** Establish ground truth. Identify discrepancies between the PR description and the actual code/logic. Audit `scripts/evidence/` and CI workflow changes.
*   **W2: P0 correctness fixes**
    *   **Goal:** Fix broken logic. Ensure `generate_evidence_bundle.mjs` and verification scripts correctly handle missing files, empty IDs, and schema validation. Align `package.json` scripts.
*   **W3: Evidence registry alignment**
    *   **Goal:** Semantic consistency. Resolve conflicts between `docs/governance/OPS_EVIDENCE_RETENTION_POLICY.md` and the new "Evidence Map". De-duplicate "Evidence ID" definitions.
*   **W4: Tests hardening**
    *   **Goal:** Prevent regression. Add failure-case tests (invalid IDs, tampered manifests).
*   **W5: Docs alignment**
    *   **Goal:** Truth in documentation. Update `docs/governance/` to accurately reflect the new gate and avoid false claims.
*   **W6: CI stability & artifact verification**
    *   **Goal:** Release readiness. Finalize `.github/workflows/` changes. Verify artifact upload paths and mergeability.

## B) Agent Assignments

### W1: Reality verification & diff audit
*   **Primary Agent:** **Qwen** (Determinism/Robustness)
*   **Supporting:** Antigravity (Security check on regex/parsers)
*   **Deliverables:**
    *   `audit_report.md`: List of logic gaps, race conditions, or weak validators.
    *   `repro_script.sh`: A bash script that triggers failure modes.
*   **Definition of Done:** Audit report verified; repro script fails on current PR code.
*   **Timebox:** 1 hour

### W2: P0 correctness fixes
*   **Primary Agent:** **Codex** (Implementer)
*   **Supporting:** Qwen (Verification)
*   **Deliverables:**
    *   `scripts/evidence/generate_evidence_bundle.mjs`: Patched for robust error handling.
    *   `scripts/ci/verify_evidence_consistency.mjs`: Strict validator script.
    *   `package.json`: Updated `scripts` block.
*   **Definition of Done:** `repro_script.sh` from W1 passes. `pnpm run evidence:check` succeeds locally.
*   **Timebox:** 2 hours

### W3: Evidence registry alignment
*   **Primary Agent:** **Gemini** (Architecture)
*   **Supporting:** Codex
*   **Deliverables:**
    *   `docs/governance/evidence_schema.json`: Canonical schema for evidence IDs.
    *   Updates to `manifest.json` generation logic.
*   **Definition of Done:** Single source of truth for "Evidence ID" format exists and is referenced in code.
*   **Timebox:** 2 hours

### W4: Tests hardening
*   **Primary Agent:** **Codex** (Implementer)
*   **Supporting:** Antigravity (Fuzzing suggestions)
*   **Deliverables:**
    *   `tests/governance/evidence_consistency.test.js`: New Jest/Node test suite.
    *   Test cases for: Empty ID, Special chars, Mismatched checksums.
*   **Definition of Done:** New tests pass in CI and locally.
*   **Timebox:** 2 hours

### W5: Docs alignment
*   **Primary Agent:** **Gemini** (Architecture)
*   **Supporting:** Antigravity (Policy hygiene)
*   **Deliverables:**
    *   `docs/governance/RUNTIME_ENFORCEMENT.md`: Updated with Evidence ID requirements.
    *   `docs/governance/INDEX.yml`: Updated entry.
*   **Definition of Done:** Docs accurately reflect the new gate and policy.
*   **Timebox:** 1 hour

### W6: CI stability & artifact verification
*   **Primary Agent:** **Atlas** (Release Captain)
*   **Supporting:** Qwen (Job ordering)
*   **Deliverables:**
    *   `.github/workflows/ga-gate.yml`: Integration of the evidence check.
    *   CI Verification Report (green build logs).
*   **Definition of Done:** CI is green. Artifacts are uploaded.
*   **Timebox:** 1 hour

## C) Handoff Protocol

*   **Communication:** Agents will append findings to `scratchpad/PR_16231_Log.md`.
    *   Format: `[Agent Name] [Timestamp] Status: {PASS/FAIL} - {Notes}`.
*   **Concurrency:** Sequential Execution (W1 -> W2 -> ... -> W6). W3 can start during W2.
*   **Integration:** All changes will be committed to the feature branch.
    *   Commit convention: `fix(governance): [W#] <Description>`

## D) Merge Criteria & Verification Commands

**Required Checks:**
*   `Governance / Evidence ID Consistency`
*   `Governance / Docs Integrity`

**Local Commands:**
```bash
# 1. Clean verify
pnpm install && pnpm run build

# 2. Run gate logic
./scripts/evidence/verify_evidence_bundle.mjs --strict

# 3. Run tests
pnpm test:governance
```

**Artifact Paths:**
*   `dist/evidence/manifest.json`
*   `dist/evidence/checksums.sha256`

**Ready to Merge:**
*   All W1-W6 deliverables present.
*   CI Green.
*   No "TODO" comments related to gate logic.

## E) Escalation & Pivot Plan

**If P0 issues are too large:**
*   **Scope Reduction:** Downgrade CI gate to "Warning" (exit 0).
*   **Deferral:** Merge docs and basic scripts; defer enforcement to follow-up issue.
*   **Minimum Viable PR:** Ensure at least the `docs/governance` updates land to clarify the standard.
