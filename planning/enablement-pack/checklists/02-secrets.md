# Prompt 2: Secrets & Security Checklist

- [ ] **Scan**: Run `trufflehound` or `git-secrets` on repo history.
- [ ] **Remediate**:
    - [ ] Rotate exposed keys (if any).
    - [ ] Scrub history (BFG Repo-Cleaner or git-filter-repo) if necessary.
- [ ] **Prevention**:
    - [ ] Configure `pre-commit` hook for secrets.
    - [ ] Update `.gitignore` to exclude sensitive files/env vars.
- [ ] **Verification**:
    - [ ] Clean scan report.
    - [ ] Pre-commit hook blocks a dummy secret commit.
