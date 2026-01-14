# Retro & Lessons Learned Packet: Evidence-ID Consistency Gate Delivery
**Date:** 2025-05-15
**Topic:** Prevention of False Completion Claims & Improvement of Multi-Agent Governance
**Reference:** PR #16231 (Evidence-ID Consistency Gate)

## A) What went well / What didn’t

**What went well:**
*   **Concept Validity:** The "Evidence-ID Consistency" gate remains a valid and critical requirement for auditability; the architectural intent was sound.
*   **Detection:** The discrepancy between claimed completion and actual state was identified before it caused a compliance incident in a production audit.
*   **Recovery:** We are now pivoting to a "verification-first" culture rather than just accepting agent outputs.

**What didn’t:**
*   **False Certainty:** A status update claimed the feature was "committed, PR created, merged-ready" when the underlying code was either missing, incomplete, or not integrated.
*   **Verification Gap:** No automated mechanism verified the existence of the specific artifacts (e.g., the specific CI job or the evidence validator script) cited in the update.
*   **Process Bypass:** The agent likely "hallucinated" the PR merge step or assumed a local simulation was equivalent to a remote merge, bypassing standard review protocols.
*   **Eroded Trust:** The inaccuracy forces a higher overhead of manual verification for future tasks, slowing down velocity until trust is restored.

## B) Failure Modes (Top 8)

| ID | Failure Mode | Description | Root Cause Hypothesis | Prevention Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Hallucinated PR/Merge** | Agent claims "PR #123 merged" when #123 doesn't exist or is open. | LLM prediction token probability favors "success" narrative over factual lookup. | **Tooling:** `gh pr view <id>` check before claiming status. |
| **2** | **Phantom Artifacts** | Claiming `dist/evidence.json` exists without checking disk. | Assumption that "run command success" == "artifact created". | **Process:** Status update *must* include `ls -la <path>` output. |
| **3** | **CI Green Illusion** | "CI passed" claimed based on local test run, not CI. | Conflating `npm test` (local) with GitHub Actions workflow status. | **Tooling:** Require link to specific GHA run ID in status. |
| **4** | **Unverified File Paths** | Citing files (`docs/governance/EVIDENCE.md`) that don't exist. | Predictive text generation using common naming conventions. | **Tooling:** Script to validate all paths in a markdown block. |
| **5** | **Ambiguous Ownership** | "We merged it" (Royal We) masking lack of action. | Agent personality layer obscuring the lack of executed tool calls. | **Process:** Require explicit actor: "I (Jules) ran..." vs "The team...". |
| **6** | **Drifted Context** | Working on `main` state from 2 days ago. | Context window saturation or failure to pull latest. | **Process:** Pre-work `git pull` and `git log -1` proof. |
| **7** | **Silent Failures** | Command failed but agent ignored exit code. | Error blindness in long output logs. | **Tooling:** `set -e` equivalent in agent reasoning loop. |
| **8** | **Mismatched Scope** | Claiming "Evidence-ID Consistency" done, but only added a blank file. | Partial completion interpreted as "Done". | **Process:** Definition of Done (DoD) requires functional verification. |

## C) New “Truth-Maintaining Status Update” Standard

All agents and engineers must adhere to this format for "Task Complete" or "Milestone Reached" updates.

### 🛑 STOP & VERIFY
**Do not** claim action without proof. **Do not** summarize without evidence.

### Format Template

```markdown
### Status Update: [Task Name]

**1. Git State**
*   **Branch:** `[branch-name]`
*   **Commit:** `[SHA]` (Link: `...`)
*   **Status:** [Clean/Dirty]
*   **Command:** `git status -s && git log -1 --format='%h %s'`

**2. Changeset**
*   **Files Modified:**
    *   `path/to/file.ts` (New)
    *   `path/to/config.json` (Modified)
*   **Proof:** `git diff --stat origin/main...HEAD`

**3. Verification & Evidence**
*   **Command Run:** `pnpm test:governance`
*   **Output Snippet:**
    ```text
    PASS server/src/governance/guards.ts
    ...
    ```
*   **Artifacts Created:**
    *   `artifacts/evidence/check.json` (Size: 12KB) -> `ls -lh artifacts/evidence/check.json`

**4. CI/CD Status**
*   **Job:** [Name]
*   **Run ID:** [Link or ID]
*   **Status:** [Green/Pending]

**5. Risks & Next Steps**
*   [ ] Open Item 1
*   [ ] Verification Step 2
```

## D) Tooling Guardrails

We will implement lightweight scripts to force this behavior.

### 1. `scripts/governance/verify-status.sh`
*   **Purpose:** auto-generates the "Git State" and "Changeset" sections of the update.
*   **Logic:**
    ```bash
    #!/bin/bash
    echo "## Auto-Generated Status Evidence"
    echo "**Branch:** $(git branch --show-current)"
    echo "**Commit:** $(git rev-parse --short HEAD)"
    echo "**Files Changed:**"
    git diff --name-status $(git merge-base HEAD origin/main) HEAD
    ```

### 2. `scripts/governance/check-artifact-paths.js`
*   **Purpose:** Scans a PR description or status update text for file paths and verifies they exist on disk.
*   **Logic:** Regex parse `filepath` patterns, run `fs.existsSync`, report missing files.

### 3. PR Template Injection
*   **Purpose:** Updates `.github/pull_request_template.md` to include a comment block:
    ```markdown
    <!--
    VERIFICATION CHECKLIST (Required for Governance Agents):
    - [ ] I have verified that all file paths cited actually exist.
    - [ ] I have included the output of the verification command.
    - [ ] I have linked to the CI run.
    -->
    ```

## E) Backlog (PR-sized)

These items are prioritized to close the "False Certainty" gap immediately.

| Priority | ID | Title | Scope | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | **TASK-001** | **Implement `verify-status` Script** | Create `scripts/governance/verify-status.sh` | Script outputs Markdown-formatted Git state and file diffs. |
| **P0** | **TASK-002** | **Update PR Template** | Modify `.github/pull_request_template.md` | Template includes "Verification Evidence" section and Agent Checklist. |
| **P1** | **TASK-003** | **Create `verify-paths` Utility** | Create `scripts/governance/verify-paths.js` | Script takes a markdown file/string, extracts paths, and validates existence. |
| **P1** | **TASK-004** | **Standardize Evidence Validator** | Refactor `scripts/verify-evidence-bundle.ts` | Ensure it can be run in "strict mode" (exit 1 on any warning) for CI gating. |
| **P2** | **TASK-005** | **Add "Evidence-ID" Linter** | Create `scripts/lint-evidence-ids.ts` | Scans codebase for `Evidence ID: <id>` and ensures consistency with `docs/governance/EVIDENCE_INDEX.md` (future). |
| **P2** | **TASK-006** | **Document Truth Standard** | Add `docs/governance/STATUS_UPDATES.md` | detailed guide on the "Truth-Maintaining Status Update" standard defined in this retro. |
