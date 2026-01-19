# Week-1 Governance Gate Operations Packet: Evidence ID Consistency

**Context:** Operations guide for the new "Evidence ID Consistency" governance gate (post-merge).
**Job Name:** `Governance / Evidence ID Consistency`
**Script:** `scripts/ci/verify_evidence_id_consistency.mjs`
**Artifacts:** `artifacts/governance/evidence-id-consistency/<sha>/`

---

## A) Daily Monitoring Checklist (7 days)

**Owner:** Release Captain / Governance Steward
**Frequency:** Daily (Morning Triage)

- [ ] **Check Job Execution:** Verify "Governance / Evidence ID Consistency" ran on `main` for the latest commit.
- [ ] **Artifact Verification:** Confirm existence of `report.json`, `report.md`, and `stamp.json` in `artifacts/governance/evidence-id-consistency/<sha>/`.
- [ ] **Record Status:** Log pass/fail status and the top failure reason (parse `report.json` `violations` array).
- [ ] **Track Runtime:** Record duration from CI logs (aiming for < 2m).

**Thresholds:**
*   **Flake Rate:** > 1% requires immediate investigation (P1).
*   **Runtime Regression:** > 50% increase from baseline (initial ~30s) triggers optimization review.
*   **False Positives:** > 1 reported per day pauses promotion clock.

---

## B) Failure Triage Decision Tree

**Step 1: Identify Failure Type**
Check the exit code in the CI step "Run Evidence Check":
*   **Exit 2:** Operational Failure (Infrastructure/Config)
*   **Exit 1:** Policy Failure (Logic/Validation)

**Step 2: Operational Failures (Exit 2)**
*   **Missing Evidence Map:**
    *   *Diagnosis:* Log says "ENOENT: evidence_map.yml not found".
    *   *Fix:* Verify `docs/ga/evidence_map.yml` exists. If deleted, revert.
*   **Parsing Failure:**
    *   *Diagnosis:* Log says "SyntaxError" or "YAML Exception".
    *   *Fix:* Validate syntax of `docs/governance/evidence_catalog.json` or `docs/ga/evidence_map.yml`.
*   **Missing Headers:**
    *   *Diagnosis:* Log says "Missing Governance Headers".
    *   *Fix:* Ensure CI env vars `GITHUB_TOKEN` and `CI_PARITY` are correctly passed.

**Step 3: Policy Failures (Exit 1)**
*   **Unknown Evidence IDs:**
    *   *Diagnosis:* Report lists IDs in `evidence_map.yml` not found in `evidence_catalog.json`.
    *   *Fastest Fix:* Add the missing ID to `docs/governance/evidence_catalog.json` (if valid) OR correct the typo in the map.
*   **Evidence-IDs "None" Disallowed:**
    *   *Diagnosis:* Active document has `Evidence-IDs: none` but is in a regulated scope.
    *   *Fastest Fix:* Assign a valid ID (e.g., `GOV-000` for TBD) or `N/A` with comment if truly exempt.

**P0 Issue Criteria:**
*   Gate fails on `main` for > 2 consecutive commits.
*   False positive blocks a "Critical" or "High" severity security fix.
*   Runtime exceeds 10 minutes (timeout risk).

---

## C) False Positive Handling

**Definition:** The gate fails valid code/docs due to logic errors, ambiguous regex, or correct-but-unhandled edge cases.

**Preferred Fix:**
1.  **Update Catalog:** If ID is valid but missing, add to `docs/governance/evidence_catalog.json`.
2.  **Update Map:** If map structure is valid but flagged, adjust the schema or validator logic.

**Exception Workflow (Rare):**
Use only if the fix requires significant refactoring and blocked work is critical.

*   **Registry:** `compliance/exceptions/EXCEPTIONS.yml`
*   **Required Metadata:**
    *   `id`: Unique slug (e.g., `ops-gov-consistency-001`)
    *   `expiry`: Max 7 days (e.g., `2025-XX-XX`)
    *   `rationale`: "False positive on regex X, blocking release Y."
    *   `owner`: GitHub handle of requestor.
    *   `follow_up`: Link to GitHub Issue for permanent fix.

**Validation:** Ensure adding the exception does not cause the script to crash (run locally before pushing).

---

## D) Contributor Communication

**Message Template (for PR Comments):**

> ❌ **Governance Check Failed: Evidence ID Consistency**
>
> Your PR introduces changes to governance docs or the evidence map that conflict with the catalog.
>
> **Failure Reason:** [Insert error from log, e.g., "ID 'GOV-999' not found in catalog"]
>
> **Remediation:**
> 1.  If adding a new control, register it in `docs/governance/evidence_catalog.json`.
> 2.  If fixing a typo, match the ID in `docs/ga/evidence_map.yml`.
> 3.  Run the check locally to verify:
>     ```bash
>     pnpm ci:evidence-id-consistency
>     ```
>
> See `docs/governance/DEVELOPER_GUIDE.md` for details on Evidence IDs.

---

## E) Promotion Decision (End of Week)

**Review Criteria:**
1.  **Stability:** 3+ consecutive green runs on `main`.
2.  **Artifacts:** `report.json` is consistently generated and valid.
3.  **Friction:** < 2 false positives reported total.

**Decision Options:**
*   **Keep Informational:** If flake rate > 1% or developers frequently confused by errors. Continue monitoring.
*   **Promote to Required:** If all criteria met. Add to `Branch Protection Rules` for `main`.
*   **Unified Gate Only:** If check is too slow for PRs, move to `ga-gate` logic only (not recommended for ID consistency).

**Rollback Plan:**
If promotion causes widespread friction (blocked merge trains):
1.  Remove from "Required Checks" in GitHub.
2.  Revert to "Informational" (allow failure).
3.  Open P0 to address root cause before re-enabling.
