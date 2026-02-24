# GA Evidence Dashboard

Deterministic, auditor-grade snapshot of build verification and golden-path provenance.

## Core Subjects

| Subject | Path | SHA256 |
|---|---|---|
| provenance | provenance.json | 6da1292aa90b09df13f0c6bb36eff593540d974c4b9b4030fb147fa129e1b234 |

## Verify Lanes Summary

| Lane | Artifacts | Rollup SHA256 |
|---|---:|---|

## Evidence Manifest Totals

Subjects: 1

Verify artifacts: 0

All evidence items: 1

## Attestation Target

The build provenance attestation is bound to:

- provenance.json (sha256: 6da1292aa90b09df13f0c6bb36eff593540d974c4b9b4030fb147fa129e1b234)

## Notes

- No timestamps are included in this dashboard or its upstream JSON artifacts.
- All lists are codepoint-sorted to prevent locale variance.
- Rollup digests are deterministic “digest-of-digests” over lane artifact paths + SHA256.

## GA Verification Profile

For the full definition of GA evidence requirements, see:
[docs/security/GA_EVIDENCE_PROFILE.md](docs/security/GA_EVIDENCE_PROFILE.md)

## Manual Verification

To manually verify the evidence bundle against the GA profile:

1.  Clone the repository and navigate to the `evidence/` directory.
2.  Run the verification policy using OPA:
    ```bash
    opa eval -i report.json -d ../.github/policies/ga-evidence.rego "data.ga_evidence.allow"
    ```
3.  Check for any denial messages:
    ```bash
    opa eval -i report.json -d ../.github/policies/ga-evidence.rego "data.ga_evidence.deny"
    ```
