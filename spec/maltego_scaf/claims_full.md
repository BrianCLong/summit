# Claims — SCAF

## Independent

1. Method: receive connector package with metadata; validate provenance attestation; validate SBOM; enforce execution policy; execute connector; output assurance report with measurement hash, attestation status, commitment to outputs.
2. System implementing the method.
3. CRM storing instructions for the method.

## Dependent

4. SBOM validation includes license allowlist check.
5. Execution policy constrains effects (READ/WRITE/EXPORT).
6. Assurance report includes egress receipt summarizing destinations and byte counts.
7. Cache outputs keyed by measurement hash; invalidate on change.
8. Enforces selective disclosure with egress byte budget.
9. Assurance report stored in append-only transparency log.
10. Generates counterfactual outputs under stricter policy with information-loss report.
11. Trusted execution environment attests connector execution.
12. Metadata includes contracting scope identifier; execution permitted only on match.
13. Commitment uses Merkle root over output hashes.
14. Execution policy includes NATO/coalition destination class allowlist.
