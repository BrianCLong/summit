# Secret Scanning & Hygiene

- Pre-commit with detect-secrets baseline (.secrets.baseline)
- CI secret scans with TruffleHog (optional), enable GitHub Advanced Security secret scanning.
- Store real secrets encrypted with SOPS + age; do not commit plaintext keys.
- Audit findings from initial scan: none
