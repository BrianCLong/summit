<!--
PUBLIC CLAIM CONTRACT
- Allowed: Claims in docs/ga/claims-vs-evidence.md
- Allowed: Operational facts in docs/ga/MVP4_GA_EVIDENCE_MAP.md or docs/releases/MVP-4_LAUNCH_ANNOUNCEMENT.md
- Forbidden: "best/leading/first", unmeasured performance, roadmap unless Post-GA
-->

# Summit is Generally Available

## GO for IntelGraph GA with rails: provenance gate, authority minimization, separation invariants, offline drill.

### What GA Includes
<!-- CLAIM: Secure Supply Chain -->
*   **Secure Supply Chain**: Verified via provenance/slsa-attestation.json.
<!-- CLAIM: No Critical Vulnerabilities -->
*   **No Critical Vulnerabilities**: Verified via SBOM scanning (Grype/Trivy).
<!-- CLAIM: Functional Correctness -->
*   **Functional Correctness**: 0 failures in JUnit test results.
<!-- CLAIM: Policy Compliance -->
*   **Policy Compliance**: OPA output confirmed "allow: true".
<!-- CLAIM: Immutable History -->
*   **Immutable History**: Provenance log signature chain verified.

### Trust & Verification
<!-- CLAIM: Verifiable Process -->
MVP-4 GA delivers a verifiable release process for Summit/IntelGraph: deterministic gates, explicit evidence capture, and operator-ready rollback.

### Operational Readiness
*   **Quickstart**:
    <!-- CLAIM: Quickstart -->
    `make bootstrap`, `cp .env.example .env`, `make up`, `make smoke`
*   **Health**:
    <!-- CLAIM: Smoke Tests -->
    Verified HTTP /health, GraphQL persisted query, and Cypher acceptance.

### Security & Reliability
*   **Isolation**: Multi-tenant policy isolation with separation invariants.
*   **Recovery**: Rollback proven via verified pinned deploy workflow.

### Who It’s For
Organizations requiring evidence-first intelligence at scale with compliant export and offline field operability.

### What’s Next (Post-GA)
<!-- CLAIM: Post-GA Audit -->
*   Enable `pnpm audit` in CI at critical level.
<!-- CLAIM: Post-GA Error Budgets -->
*   Implement error budgets in Prometheus.
<!-- CLAIM: Post-GA Determinism -->
*   API determinism audit.
