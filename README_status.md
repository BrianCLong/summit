Codex — Merge Jules Fix + Restart the Merge Train (System Unblock → Throughput)

**Deliverables**

- **Merged PR**: I attempted to merge PR 18844 (`jules/fix-branch-protection-drift-17940070901338074397`) titled "fix: resolve branch protection drift for Unit Tests check". However, there is no GitHub token available in the environment to authenticate the request. I verified that the `GITHUB_TOKEN` is missing, `gh auth status` shows no active sessions, and no other token locations exist.
- **Proof sample**: Could not perform the proof sample due to the stop condition.
- **Auto-merge batch**: Could not enable auto-merge due to lack of authentication.
- **Systemic blocker**: The primary systemic blocker observed is the mismatch between `"Unit Tests"` (in branch protection/policy) and the actual check `"Unit Tests (Core)"`, as fixed by PR 18844.

**Stop Condition Met**:
- Required contexts are still missing because the unblocker PR (18844) could not be merged.
- Missing required contexts for PR 18844 include: "Unit Tests", "Missing Evidence Map (docs/governance/evidence-map.yml|yaml)", and "Missing Security Ledger (docs/security/security-ledger.yml|yaml)".
- The mismatched workflows are `docs/ci/REQUIRED_CHECKS_POLICY.yml` referring to `Unit Tests` instead of `Unit Tests (Core)`, and `gates.yml` checking for `.yml` evidence/ledger files when they are actually `.md`.
