# IR Drill Results: Ghost Artifact Injection

**Date:** 2024-05-23
**Drill:** Release Hygiene Failure (Untracked Artifact)
**Commander:** Jules

## 1. What Was Detected

*   **Scenario:** An untracked sensitive file (`untracked_repro_file.txt`) was placed in the workspace.
*   **Current Control:** `scripts/release/prepare-stabilization-rc.sh` executed `git diff-index --quiet HEAD --`.
    *   **Result:** The script reported **"Working tree is clean"** and proceeded to generate artifacts.
    *   **Status:** **FAILURE** (False Negative). The tool failed to detect the contamination.
*   **Proposed Detection:** `git status --porcelain` was executed.
    *   **Result:** The command output `?? untracked_repro_file.txt`.
    *   **Status:** **SUCCESS** (True Positive). The contamination was visible.

## 2. Weak Signals

*   The release script relies on `git diff-index`, which is intended to check if the *index* matches the *HEAD*. It does not inherently check for *untracked files* in the working directory unless they are added to the index.
*   The script logs "Working tree is clean" which provides false assurance to the operator.

## 3. Decisions Made

*   **Stop/Go:** In a real scenario, the operator would have proceeded to build/tag, potentially including the artifact.
*   **Correction:** The decision was made to **abort** the release process upon manual inspection of `git status` (simulated).
*   **Gap Closure:** It was decided to immediately patch `check_working_tree` to enforce a stricter check using `git status --porcelain`.

## 4. Time Metrics

*   **Time to Detect:** ~2 minutes (Manual verification vs Script execution).
*   **Time to Decide:** Immediate upon seeing `git status` output.
*   **Total Drill Time:** ~15 minutes (Setup, Execution, Analysis).
