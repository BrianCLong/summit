# {{SERVICE_NAME}}

Golden Path worker template for resilient background processing with CI/CD hardening.

## Commands

- `npm run dev` – start local worker with auto-reload.
- `npm test` – execute Jest test suite.
- `npm run queue:drain` – drop all jobs from the configured queue (uses Redis URL).

## Compliance Gates

- SBOM: `sbom/sbom.json`
- Vulnerability report: `reports/grype.json`
- SLSA provenance + cosign signature published on release

Review `docs/queues.md` for queue topology and `docs/rollback-playbook.md` for recovery.
