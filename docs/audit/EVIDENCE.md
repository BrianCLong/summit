# Evidence Registry and Retention

This registry defines what counts as admissible evidence, how it is produced automatically, and how long it is retained. All entries must be present in the machine-readable catalog (`audit/evidence-registry.yaml`).

## Evidence Types

- **CI policy gate** — Lint, test, and security gates executed per PR from `.github/workflows/pr-quality-gate.yml`.
- **Provenance ledger** — Immutable append-only log for code, data, and model events stored in `audit/ga-evidence`.
- **SBOM and scans** — SBOMs plus vulnerability findings generated during build (`sbom-mc-v0.4.5.json`).
- **SLO monitoring** — Burn-rate metrics and synthetic probe results exported to `audit/ga-evidence/slo`.
- **Debt trend** — Weekly debt trend reports (including AI bias/drift debt) at `audit/ga-evidence/debt-trends`.
- **Exception approvals** — Time-bounded risk acceptances tracked in `audit/exceptions.yaml`.

## Retention and Integrity

- CI policy gate: 365 days, SHA-256 with immutable storage.
- Provenance ledger: 5 years, hash-chain append-only.
- SBOM/scans: 365 days, SHA-256 and signed attestation.
- SLO monitoring: 180 days, stored in tamper-evident store.
- Debt trend: 365 days, SHA-256 and immutable store.
- Exception approvals: 365 days, Git history plus commit hashes.

## Operational Rules

- Evidence must be generated automatically by CI or runtime agents; manual uploads are not permitted.
- Evidence entries must specify integrity guarantees and retention; missing metadata is a build blocker.
- CI workflows may prune expired evidence only after new artifacts are captured to preserve continuity.
- The audit pack generator consumes this registry to assemble deterministic bundles for auditors.
