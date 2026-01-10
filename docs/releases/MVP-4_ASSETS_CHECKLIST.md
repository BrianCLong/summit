# MVP-4 GA Release Assets Checklist

## Release metadata

- Tag name: `v4.0.4`
- Release title: `MVP-4 GA — v4.0.4`
- Release notes source: `docs/releases/MVP-4_RELEASE_NOTES_FINAL.md`

## Evidence and runbooks

- GA readiness report: `docs/release/GA_READINESS_REPORT.md`
- GA evidence index: `docs/release/GA_EVIDENCE_INDEX.md`
- GA checklist: `docs/release/GA_CHECKLIST.md`
- Release runbook: `docs/releases/runbook.md`
- MVP-4 rollback protocol: `docs/releases/v4.0.0/MVP4-GA-ROLLBACK.md`
- Summit readiness assertion: `docs/SUMMIT_READINESS_ASSERTION.md`

## Artifact list

- Expected by release workflow (not produced in-repo by default):
  - `dist/release/*` (server and client images/bundles)
  - `release-bundle/compliance-bundle-v*.tgz`
  - `evidence-bundle.tar.gz`
  - `sbom.json`
  - `provenance.json`
- If no artifacts exist, state: “No artifacts produced in this workspace; generate via the release workflow or `make release`.”

## Screenshot plan

- Terminal evidence:
  - `npm run test:quick` output (sanity check).
  - `make dev-smoke` output (UI and gateway health checks).
- UI evidence:
  - Browser screenshot of `http://localhost:3000` after `make dev-up`.
- Gateway health evidence:
  - `curl -f http://localhost:8080/healthz` output in terminal.
