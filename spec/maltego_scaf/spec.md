# Maltego SCAF: Supply-Chain Assurance Fabric

Enforces SBOM/provenance validation and execution policies for connectors, emitting procurement-ready assurance reports.

## Capabilities

- Validate provenance attestations and SBOMs for connector packages.
- Enforce execution policy: allowed destinations, effect class, rate limits, classification scope.
- Produce assurance report with measurement hash, attestation status, egress receipt commitment.
- Cache outputs by measurement hash; generate counterfactual outputs under stricter policies.
