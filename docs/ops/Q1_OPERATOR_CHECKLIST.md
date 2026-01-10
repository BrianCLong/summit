# Q1 Operator Checklist

> **Role**: Release Captain / On-Call
> **Frequency**: Weekly / Pre-Release

## 🛑 What Should NEVER Be Skipped
These steps are the "Red Line" for release integrity.

*   [ ] **Green CI on Main**: Never release from a red build, even for a "docs fix".
*   [ ] **Evidence Bundle Generation**: The `evidence.tar.gz` MUST exist for every tag.
*   [ ] **Hygiene Check**: `pnpm verify:hygiene` must pass.

## 🤖 What Automation Covers (Do Not Do Manually)
*   [x] **Checking for untracked files**: Covered by `scripts/ops/check_repo_hygiene.ts`.
*   [x] **Checking for lockfile drift**: Covered by `scripts/ops/check_repo_hygiene.ts`.
*   [x] **Updating Security Metrics**: Covered by `scripts/ops/update_trust_scorecard.ts`.
*   [x] **Verifying Auth Coverage**: Covered by `scripts/verify-ga-security.ts`.

## 🛠 Weekly Operator Tasks (To Be Automating Next)
1.  **Review Trust Snapshot**: Check `docs/security/SECURITY_SCORECARD.json` for degradation.
2.  **Audit GA Drift**: Run `scripts/ga/verify_ga_integrity.ts` (Planned) to ensure `GA_DEFINITION.md` is respected.
3.  **Quarantine Flakes**: Check for flaky tests and move them to `test:quarantine` if they block CI.

## 📢 Communication
*   If **Hygiene Check** fails: Tell dev to run `pnpm install` and commit the lockfile.
*   If **Trust Score** drops: Post to `#security-alerts`.
