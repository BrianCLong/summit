# Claims vs Evidence

| Claim                           | Evidence Artifact                  | Verification Method                 |
| ------------------------------- | ---------------------------------- | ----------------------------------- |
| **Secure Supply Chain**         | `provenance/slsa-attestation.json` | Verify signature with Cosign.       |
| **No Critical Vulnerabilities** | `sbom/*.json`                      | Scan SBOM with Grype/Trivy.         |
| **Functional Correctness**      | `test-results/junit.xml`           | Check for 0 failures.               |
| **Policy Compliance**           | `test-results/policy-check.log`    | Check OPA output for "allow: true". |
| **Immutable History**           | `ledger/provenance-log.sig`        | Verify hash chain continuity.       |
