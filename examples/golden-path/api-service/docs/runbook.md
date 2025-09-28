# Summit Golden Path API Runbook

- **Pager:** #oncall-summit-golden-path-api
- **Owning team:** Golden Path Platform

## Golden Signals

| Signal       | Source                                            | SLO         |
| ------------ | ------------------------------------------------- | ----------- |
| Availability | Synthetic probe `synthetics/http_api_health.json` | 99.9%       |
| Latency      | Grafana dashboard `Golden Path/API`               | p95 < 250ms |

## Deployment Verification

1. Verify GitHub Actions run succeeded and uploaded SBOM + provenance artifacts.
2. Run `cosign verify-blob --certificate release.pem --signature release.sig dist/release.tar.gz` against the release asset.
3. Confirm canary synthetic probe success before widening traffic.

## Rollback

Use the `docs/rollback-playbook.md` procedure that re-deploys the previous signed artifact after verifying provenance.
