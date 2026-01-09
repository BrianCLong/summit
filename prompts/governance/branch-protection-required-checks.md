# Branch protection + required checks enforcement

MISSION (P0)
Make branch protection on `main` enforce the repo’s intended GA gates by configuring and continuously verifying required status checks so merges cannot bypass CI signal.

GOAL STATE

1. `main` branch protection requires the correct status checks (the ones that must be green for GA).
2. A CI job validates branch protection matches policy and fails loudly if drift is detected.
3. Evidence exists (docs + script output) showing policy, applied config, and verification commands.

OPERATING RULES

- Prefer policy-driven enforcement (a policy file in-repo as source of truth) and scripts that can read/verify without requiring admin secrets.
- Any apply step that requires admin privileges must be clearly separated and documented. Verification must still work without elevated permissions.
- Do not change required checks names casually; align to actual workflow job names.

PHASE 0 — BASELINE AND DISCOVER

1. Identify:
   - existing branch protection scripts (search for reconcile_branch_protection, required_checks, branch_protection, REQUIRED_CHECKS_POLICY).
   - any policy file listing required checks (YAML/JSON).
   - current CI workflow job names in `.github/workflows/ci.yml` (and any other workflows that produce required checks).
2. Capture current server-side branch protection state via GitHub API:
   - Use `gh api` to read protection details for `main`.
   - If the endpoint returns 404/403, treat it as a signal: either protections are missing or you lack permission; document it and proceed to implement the verification guardrails anyway.

PHASE 1 — DEFINE THE SOURCE OF TRUTH

1. Ensure there is a single canonical list of required checks (by name) that should gate merges to `main`.
2. Normalize that list to match real CI check names (exact string matching).
3. Update/add:
   - `docs/release/BRANCH_PROTECTION_POLICY.md` describing:
     - the required checks
     - why each is required
     - how to verify locally and via CI
     - how to apply protections (admin step)
4. If a REQUIRED_CHECKS_POLICY file exists, keep it as the authoritative list; otherwise create a governance REQUIRED_CHECKS_POLICY file with the required schema.

PHASE 2 — IMPLEMENT VERIFICATION (NO ADMIN REQUIRED)

1. Add or extend a script that:
   - reads the policy file
   - reads current branch protection config via GitHub API
   - compares required check sets and other key flags
   - exits non-zero with a crisp diff if drift is detected
2. Add tests for the script verifying:
   - correct parsing of YAML
   - stable ordering and diff output
   - unknown/forbidden states are treated as failures with actionable guidance (unless explicitly configured to warn-only for forks)
3. Add a CI job `branch-protection:verify` that runs on:
   - pull_request (read-only verification)
   - schedule (nightly drift detection)

PHASE 3 — IMPLEMENT APPLY (OPTIONAL, ADMIN-GATED)

If an apply script exists and permissions are available, ensure it applies required status checks and review requirements, and document the manual runbook when admin privileges are required.

PHASE 4 — PR + EVIDENCE

1. Provide a PR that includes:
   - policy file (or updates)
   - verification script + tests
   - CI job for verification (and schedule)
   - documentation/runbook
2. PR description must include:
   - Current observed protection state (including any 404/403)
   - Exact required checks list being enforced
   - How verification works in PRs vs scheduled runs
   - How to apply protections (if applicable)
3. Local verification commands:
   - Script invocation + expected output example

STOP CONDITION
Do not stop until:

- There is a deterministic, CI-enforced verification that detects branch protection drift.
- The required checks policy is explicit, versioned, and aligned to real CI job names.
- Documentation clearly distinguishes verify (safe) from apply (admin).
