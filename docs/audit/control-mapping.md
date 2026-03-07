# Summit Control Mapping (SOC 2 & ISO 27001)

The table below links Summit governance, security, and operational controls to common audit families. It is descriptive guidance for auditors and engineers; it is **not** legal boilerplate.

| Summit Control                                     | SOC 2 Trust Service Criteria | ISO 27001:2022 Annex A | Notes                                                                                       |
| -------------------------------------------------- | ---------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| Immutable evidence bundles with manifest + hashes  | CC1.1, CC7.2, CC7.3          | A.8.16, A.5.36         | CI emits manifest + SHA-256 for every artifact; `manifest.sha256` verifies integrity.       |
| GA gate enforcement for releases                   | CC5.3, CC6.1                 | A.5.31, A.8.32         | GA gate blocks when evidence bundle components are missing or misconfigured.                |
| SBOM generation and retention                      | CC6.7, CC7.1                 | A.5.20, A.8.9          | SPDX/CycloneDX SBOMs captured per commit/tag for supply-chain review.                       |
| Provenance capture (builder, commit, workflow URL) | CC6.6, CC7.2                 | A.8.24, A.8.28         | Provenance JSON provides traceability for SLSA-style attestations.                          |
| SLO configuration and snapshots                    | CC3.1, CC4.1, CC5.2          | A.5.1, A.5.23          | `slo/config.yaml` + snapshot JSON document reliability objectives and evaluation source.    |
| LLM policy configuration and guardrails            | CC2.2, CC6.6                 | A.5.34, A.8.11         | `llm/policy.yaml` captures AI provider, routing, and safety guardrails.                     |
| Multi-tenant isolation & residency controls        | CC6.1, CC6.6                 | A.5.12, A.5.14, A.8.23 | Summary documents isolation layers, authentication, network policy, and residency defaults. |
| CI run metadata + workflow attestation             | CC5.2, CC7.2                 | A.5.36, A.8.31         | `ci/metadata.json` links evidence to the exact pipeline execution.                          |
| Access logging and audit monitoring                | CC7.2, CC7.3                 | A.5.15, A.8.15         | Logging/alerting references are documented in the multi-tenant summary.                     |
| Policy and control documentation                   | CC2.1, CC2.2                 | A.5.1, A.6.3           | Control mapping and evidence README guide reviewers and operators.                          |

**Usage guidance**

- Auditors: start with the GA gate report, manifest verification, then review SBOMs, provenance, and control mapping for scope coverage.
- Engineers: keep this mapping updated when controls change; evidence generation will fail if the mapping document is missing.
