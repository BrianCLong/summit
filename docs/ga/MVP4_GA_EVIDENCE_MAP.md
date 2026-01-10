# MVP-4-GA Evidence Map

This map links high-level GA claims to executable verification commands.
It serves as the source of truth for the Trust Dashboard.

| Claim ID | Category | Description | Verification Command | Expected Indicator | Status |
|----------|----------|-------------|----------------------|--------------------|--------|
| TR-01 | Operational | Working tree is clean and trustworthy | `git status --porcelain` | Output empty | REQUIRED |
| TR-02 | Operational | No untracked files potentially hiding secrets | `git ls-files --others --exclude-standard` | Output empty | REQUIRED |
| TR-03 | GA | GA Baseline declaration is present | `grep "Status:** **General Availability" docs/ga/ga-declaration.md` | Exit 0 | REQUIRED |
| TR-04 | Security | Security Ledger has no open High/Critical issues | `grep` for UNRESOLVED/OPEN in Ledger | Output empty | REQUIRED |
| TR-05 | Trust | Trust Dashboard itself runs cleanly | `node scripts/ops/generate_trust_dashboard.mjs --mode=hard` | Exits 0; report shows PASS on hard gates | REQUIRED |
