# Supply Chain Assurance (SCA)

This package bootstraps supply-chain security controls for Summit, covering SBOM generation (SPDX + CycloneDX), vulnerability and license governance, Sigstore attestations, and compliance exports. The toolkit ships language-agnostic policy plus minimal Go and Node orchestrators so the same controls can gate containers, services, and libraries across the fleet.

## Capabilities
- **SBOM generation**: deterministic SPDX and CycloneDX documents for each image or package, stored in `manifests/` with digest-based filenames.
- **Vulnerability scanning**: score CVEs against baseline CVSS thresholds and compute burn-down deltas for dashboards.
- **License compliance**: blocked-license enforcement with dual-control exceptions and expiring waivers.
- **Sigstore attestations**: keyless signing for SBOMs and scan manifests; attestations are emitted alongside artifacts for Compliance Center ingestion.
- **Dashboards**: burn-down and license exception lenses for Grafana/Loki; JSON definitions live under `dashboards/`.
- **GitHub App automation**: hooks for automated remediation PRs sourced from vulnerability advisories.

## Quickstart
1. Populate `policy/images.json` with the container images to gate.
2. Update `policy/policy.json` with CVSS and license thresholds.
3. Run the Node CLI for local checks:
   ```bash
   node security/supply-chain/node/index.js license-check \
     --policy security/supply-chain/policy/policy.json \
     --licenses security/supply-chain/policy/sample-licenses.json \
     --exceptions security/supply-chain/policy/license-exceptions.json
   ```
4. Validate vulnerability policy:
   ```bash
   node security/supply-chain/node/index.js vuln-policy \
     --policy security/supply-chain/policy/policy.json \
     --vulns security/supply-chain/policy/sample-vulns.json
   ```
5. Build the Go orchestrator:
   ```bash
   (cd security/supply-chain/go && go test ./... && go run ./cmd/sca --help)
   ```

## CI/CD integration
- `.github/workflows/supply-chain.yml` runs SBOM + vulnerability + license gates per-image using the supplied policy.
- Cosign attestations are produced for SBOMs; signed artifacts are uploaded for Compliance Center.
- Violations (CVSS over baseline or disallowed licenses without dual approvals) fail the workflow.

## Directory layout
- `go/`: Lightweight CLI for deterministic SBOM manifests and attestations.
- `node/`: Policy enforcement and dashboard reducers.
- `policy/`: CVSS baselines, blocked licenses, license exceptions, image inventory, and sample datasets.
- `dashboards/`: Grafana-ready JSON for vulnerability burn-down and license exception overviews.
- `github-app/`: GitHub App blueprint for automated PRs with suggested fixes.
- `manifests/`: Output folder for generated SBOMs, scan reports, and attestations.

## Dual control
License exceptions require at least two approvers with distinct identities; the policy engine enforces expiration dates and purpose notes. Update `policy/license-exceptions.json` with approvals before running the gates.

## Compliance Center export
All SBOMs, scan manifests, and cosign attestations are written under `manifests/` with digest-aware names. CI uploads these artifacts so Compliance Center can ingest them without additional transformation.
