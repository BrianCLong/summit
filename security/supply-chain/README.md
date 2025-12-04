# Supply Chain Security Suite

This package scaffolds SBOM generation, vulnerability scanning, license governance, and Sigstore attestations for Summit services. It includes both Go and Node runners, dual-control exception workflows, and CI gates that export signed manifests to the Compliance Center.

## Components

- **Go toolkit (`security/supply-chain/go`)** – deterministic SBOM emitters (SPDX & CycloneDX), policy-aware license/vulnerability evaluation, and Sigstore-friendly attestations.
- **Node orchestrator (`security/supply-chain/node`)** – lightweight wrappers for CI/CD, JSON exports, and integration with external scanners.
- **Policies (`security/supply-chain/policy.yaml`)** – baseline CVSS thresholds, blocked license lists, dual-control approvers, and reproducible-build attestations.
- **Dashboards (`security/supply-chain/dashboards`)** – burn-down and exception-tracking specs ready for Grafana/Looker.
- **Pipelines (`.github/workflows/supply-chain.yml`)** – CI gates for SBOM per image, license/exception enforcement, reproducible-build proof, and export of signed manifests to the Compliance Center.

## Usage

### Node CLI (local development)

```bash
cd security/supply-chain/node
npm install
node index.js sbom --image ghcr.io/summit/service:latest
node index.js scan --report reports/vulns.json
node index.js licenses --sbom reports/sbom.spdx.json
node index.js attest --manifest manifests/app.json --signature-path artifacts/cosign.sig
```

### Go CLI (deterministic pipelines)

```bash
cd security/supply-chain/go
go run ./cmd/supplychain --policy ../policy.yaml --image ghcr.io/summit/service:latest --format spdx
```

The Go binary emits SPDX or CycloneDX documents and enforces baseline CVSS thresholds and blocked-license policy. Dual-control exception requests must include at least two distinct approvers from `policy.yaml`.

### Sigstore attestations

Use `scripts/export_manifests.sh` to sign SBOMs and vulnerability manifests with Cosign and forward them to the Compliance Center API. The GitHub Actions workflow wires this script into CI so every container image publishes: SBOM (SPDX+CycloneDX), vulnerability report, license exceptions, and provenance attestations.

## Dual-control & exception flow

1. All license exceptions require two approvers from the `dual_control.approvers` list (minimum enforced by both Go/Node runners).
2. Exceptions expire after the configured window; the dashboard highlights pending expirations.
3. Compliance Center receives signed exception manifests so downstream auditors can verify provenance.

## Roadmap-aligned artifacts

- Baseline CVSS policy and blocked-license filters are centrally defined in `policy.yaml`.
- Burn-down and exception dashboards ship as shareable JSON specs under `dashboards/`.
- GitHub App automation opens remediation PRs whenever a scanner surfaces a fix version.
