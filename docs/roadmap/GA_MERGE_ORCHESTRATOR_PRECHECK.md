# GA Merge Orchestrator Precheck (Deterministic Runtime Gate)

This precheck is the governed exception control that must pass before running the Golden Main GA Merge Orchestrator.

## Objective

Guarantee orchestration runtime readiness so `STEP 0` inventory commands execute deterministically.

## Required Preconditions

1. **GitHub CLI available**
   - Command: `command -v gh`
   - Pass criterion: exits `0` and returns executable path.
2. **GitHub authentication active**
   - Command: `gh auth status`
   - Pass criterion: authenticated account with repo read/write scope.
3. **Repository remote configured**
   - Command: `git remote get-url origin`
   - Pass criterion: non-empty `origin` URL that points to the target Summit repository.
4. **Main branch resolvable from origin**
   - Command: `git ls-remote --heads origin main`
   - Pass criterion: returns a `refs/heads/main` hash.

## Canonical Preflight Command Block

Run this exact sequence before every orchestrator attempt:

```bash
set -euo pipefail

command -v gh

gh auth status

git remote get-url origin

git fetch origin

git ls-remote --heads origin main | rg 'refs/heads/main$'

# Optional hard assertion for audit evidence
gh repo view --json nameWithOwner,defaultBranchRef
```

## Failure Classification

- **Missing CLI** → `Stabilize: GitHub CLI availability for GA orchestration runtime`
- **Missing auth** → `Stabilize: GitHub auth bootstrap for GA orchestration runtime`
- **Missing origin remote** → `Stabilize: Origin remote bootstrap for GA orchestration runtime`
- **Main unresolved** → `Stabilize: Remote main branch visibility for GA orchestration runtime`

## Evidence Requirements

Attach the following artifacts in PR description or evidence bundle:

- Raw terminal output for each preflight command.
- Timestamped execution environment details (`uname -a`, `git --version`, `gh --version`).
- If failed: exact stabilize title selected from failure classification above.

## Execution Continuation Rule

Only run the merge-train loop after all precheck commands pass.
If any precheck fails, stop and ship a single atomic `Stabilize:` PR for that failed precondition.
