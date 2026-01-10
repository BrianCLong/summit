# IR Drill Runbook: Ghost Artifact Injection

**Scenario:** Release Hygiene Failure (Untracked Artifact)
**Severity:** SEV2 (Potential Information Disclosure)

## 1. Detection Signals

The primary failure mode is that standard checks *pass* when they should *fail*.

**Command to Check Current State (The "Weak" Signal):**
```bash
git diff-index --quiet HEAD --
echo $?
# Returns 0 (Pass) even if untracked files exist
```

**Command to Reveal Truth (The "Strong" Signal):**
```bash
git status --porcelain
# Returns output if ANY untracked/modified file exists
```

## 2. Triage Steps

**Role:** Release Engineer / Incident Commander

1.  **Verify Git Status:**
    *   Run `git status --porcelain`.
    *   If output is **empty**: System is clean. Proceed.
    *   If output is **not empty**: **STOP**.

2.  **Analyze Untracked Files:**
    *   Are the files intended for the release? (Likely No).
    *   Are they sensitive? (e.g., keys, env vars, dumps).

3.  **Decision Gates:**
    *   **Gate 1 (Cleanliness):** Is `git status --porcelain` empty?
        *   YES -> Proceed to Build.
        *   NO -> ABORT.

4.  **Mitigation:**
    *   **Immediate:** Delete untracked files or add to `.gitignore`.
    *   **Systemic:** Update `prepare-stabilization-rc.sh` to fail on untracked files.

## 3. Time Targets

*   **Detect:** < 1 minute (Script should fail immediately).
*   **Decide:** < 5 minutes (Abort release if dirty).
*   **Mitigate:** < 1 hour (Patch script).

## 4. Simulation Instructions (Table-Top)

1.  **Setup:**
    *   Create a dummy sensitive file: `touch release_secret.json`.
    *   Ensure it is NOT ignored (check `.gitignore`).

2.  **Execute Current Control:**
    *   Run: `git diff-index --quiet HEAD -- && echo "CLEAN" || echo "DIRTY"`
    *   **Expected:** Output "CLEAN" (Fail).

3.  **Execute Proposed Detection:**
    *   Run: `git status --porcelain`
    *   **Expected:** Output `?? release_secret.json` (Success).

4.  **Execute Release Script (Dry Run):**
    *   Run: `./scripts/release/prepare-stabilization-rc.sh --dry-run`
    *   **Expected:** Script runs successfully (Incident).

5.  **Cleanup:**
    *   `rm release_secret.json`
