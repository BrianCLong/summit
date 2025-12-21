# Data Retention Policy
- Default retention: 365 days unless regulated data requires longer retention.
- Exported manifests: retained 7 years with cryptographic proofs for audit.
- PII minimization: collect only necessary fields; apply hashing or tokenization where possible.
- Disposal: secure wipe using storage-native delete plus key revocation; verify via quarterly sampling.
- Backups: follow `ops/runbooks/backup-restore.md`; retention mirrors production data lifecycle.
