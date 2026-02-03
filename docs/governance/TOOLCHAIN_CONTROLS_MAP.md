# Toolchain Controls Map (v1)

This document maps Summit’s devstation toolchain and evidence artifacts to SOC 2, ISO 27001, and SLSA objectives.

## Evidence artifacts (canonical)

- `scripts/devstation/tools.lock.yaml`
  Purpose: version pinning (determinism), change control

- `scripts/devstation/verify-tools.sh` → `devstation.evidence.json`
  Purpose: auditable proof of tool versions/hashes used for work

- Security scan outputs (recommended paths):
  - `reports/sbom/` (syft/cyclonedx)
  - `reports/vuln/` (grype/trivy)
  - `reports/secrets/` (gitleaks)
  - `reports/policy/` (opa/conftest/regal/cue)
  - `reports/ci/` (actionlint)

## Control mapping (high level)

| Domain | Tooling / Artifact | SOC 2 (Typical Trust Services) | ISO 27001 (Typical Annex A areas) | SLSA |
|---|---|---|---|---|
| Change control | git, gh, pre-commit, actionlint | CC8.1, CC8.2 (change management) | Change management, secure development | — |
| Build integrity / reproducibility | tools.lock.yaml, devstation.evidence.json, CI transcripts | CC7.2, CC8.x | Secure SDLC, logging, configuration | SLSA Build L2-L3 (hermeticity helps), Provenance |
| Vulnerability management | trivy, grype | CC7.1, CC7.2 | Vulnerability management, patching | Supports hardened build inputs |
| SBOM generation | syft, cyclonedx | CC7.x (risk mgmt), availability | Asset inventory, supplier mgmt | SLSA “dependencies visible”; supports provenance review |
| Secret detection | gitleaks | CC6.1, CC6.6 | Secrets handling, access control | Reduces compromise risk |
| Provenance & verification | cosign, slsa-verifier | CC7.2, CC7.3 | Integrity, supplier security | SLSA Provenance verification |
| Policy-as-code | opa, conftest, regal, cue | CC6.7, CC7.2 | Secure configuration, compliance validation | Supports build/deploy policy gates |
| Kubernetes safety | kubeconform, kube-linter, kubectl/helm | CC7.2 (ops stability), availability | Secure operations, change mgmt | Supports secure deployment controls |
| Infrastructure as code | terraform, tflint, tfsec | CC8.1, CC7.2 | Secure configuration, supplier mgmt | Indirect: reduces infra drift |
| Observability | promtool, otelcol-contrib | CC7.2, availability/monitoring | Monitoring, logging, incident mgmt | Indirect: detects build/deploy issues |

## Practical “what to show an auditor”

1. A PR that includes:
   - `devstation.evidence.json`
   - a CI run artifact showing scans
   - a change that triggered policy checks

2. A history of pinned toolchain updates in `tools.lock.yaml` reviewed via PRs.

3. Evidence of enforcement:
   - CI gates that fail when:
     - security scans find high severity vulnerabilities (policy)
     - workflow linting fails (actionlint)
     - policy checks fail (conftest/regal/cue)

## SLSA guidance (recommended targets)

- Target baseline: SLSA Build L2 with provenance generation and verification.
- Next: L3 by tightening hermetic builds, pinned builders, and stronger isolation.
- Always verify provenance in release workflows (`slsa-verifier` + `cosign verify-attestation`).
