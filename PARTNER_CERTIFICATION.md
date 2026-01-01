# Partner Certification & Evidence

## Certification Tiers

| Tier       | Proof Required                                                                                              | Residency & Isolation                                    | Revocation Rules                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| Compatible | Pattern conformance tests; scope-creep negative test; CIS baseline attestation; SBOM provided               | Region pinning evidence; no cross-tenant movement        | Auto-revoke on drift or missing evidence after 90 days        |
| Verified   | Pattern conformance; kill-switch integration; policy decision export; pen-test summary; SOC mapping         | OPA residency policies enforced; audit trail exported    | Revoke on control failure, expired evidence, or pattern drift |
| Trusted    | Conformance + kill-switch + isolation chaos + scope-creep negative; continuous monitoring feed; SBOM deltas | Continuous residency attestation anchored in prov-ledger | Immediate revoke on chaos failure, misuse, or DRI withdrawal  |

## Evidence Expectations

- **Tests**: Each tier requires automated tests aligned to the integration pattern(s) selected by the archetype.
- **Security Posture**: Summaries must include scope, methodology, and remediation status for findings.
- **Residency Validation**: Residency/isolation proofs must be machine-verifiable (OPA traces, prov-ledger anchors).
- **Recertification Cadence**: Evidence refresh every 90 days or sooner after material changes; missing refresh triggers revocation.

## Enforcement Hooks

- `partners/certification.json` enumerates tier requirements and revocation rules.
- `scripts/ci/check_partner_model.js` fails CI if certification entries are missing tests, security posture, or residency validation evidence.
- Certification status is revocable; no manual exceptions are permitted.
