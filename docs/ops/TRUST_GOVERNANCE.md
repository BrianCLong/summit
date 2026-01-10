# Trust Governance

This document outlines the governance procedures for the Trust Dashboard.

## Trust Dashboard

The Trust Dashboard (`scripts/ops/generate_trust_dashboard.mjs`) is the authoritative signal for the repository's trust posture.

### Manual Invocation

To verify trust posture locally:

```bash
# Report Mode (Audit)
node scripts/ops/generate_trust_dashboard.mjs --mode=report

# Hard Gate Mode (Pre-Commit/Pre-Push)
node scripts/ops/generate_trust_dashboard.mjs --mode=hard
```

### CI Integration

The dashboard is intended to run in the `pr-quality-gate.yml` workflow.
Currently, it serves as a **blocking gate** for releases and a **warning signal** for PRs until the `SECURITY-ISSUE-LEDGER.md` is clean.

### Remediation

If the dashboard fails:
1.  **Git Status**: Commit or reset changes.
2.  **Untracked Files**: Delete or ignore untracked files.
3.  **GA Baseline**: Ensure GA declaration is intact.
4.  **Evidence Map**: Ensure map integrity.
5.  **Security Ledger**: Remediate Open/Unresolved issues in `docs/security/SECURITY-ISSUE-LEDGER.md`.
