# Disclosure Pack Checklist

This checklist summarizes the key artifacts and links to be included in each deployment report for comprehensive transparency and traceability.

## Core Artifacts & Links

- **Software Bill of Materials (SBOM)**:
  - Link to generated SBOM for the deployed artifact.
  - _Purpose_: Provides a complete inventory of all open-source and third-party components.

- **SLSA Provenance**:
  - Link to SLSA (Supply-chain Levels for Software Artifacts) provenance attestation.
  - _Purpose_: Verifies the origin and integrity of the software artifact.

- **OPA Policy Decisions**:
  - Link to logs or reports of OPA (Open Policy Agent) policy evaluations relevant to the deployment.
  - _Purpose_: Demonstrates adherence to defined security and compliance policies.

- **Trace Run**:
  - Link to the distributed trace of the deployment process (e.g., Jaeger, OpenTelemetry).
  - _Purpose_: Provides end-to-end visibility into the deployment workflow and identifies potential bottlenecks or failures.

- **Generated Runbook**:
  - Link to the auto-generated runbook for the specific deployment window.
  - _Purpose_: Offers dynamic, up-to-date operational guidance based on recent events and changes.

## Additional Context (if applicable)

- **Security Scan Results**: Summary or link to detailed reports from security scans (e.g., SAST, DAST, vulnerability scans).
- **Compliance Reports**: Any relevant compliance attestations or audit reports.
- **Performance Benchmarks**: Key performance indicators (KPIs) and benchmark results from pre-deployment testing.
- **Cost Analysis**: Report on the estimated and actual cost of the deployment and associated resources.

---

_This checklist is automatically generated and linked in deployment reports to ensure consistent disclosure._
