# External Auditor Replay: Attestation Verification

**Objective:** Independently verify that Summit can ingest and cryptographically verify third-party attestations without external authority or write access.

## 1. Prerequisites
*   Node.js v18+
*   Git

## 2. Setup
Clone the repository and install dependencies (read-only):
```bash
git clone https://github.com/BrianCLong/summit.git
cd summit
npm install # Installs ajv, etc.
```

## 3. Verification Procedure

### A. Inspect Trusted Roots
View the pinned public keys of authorized attestors:
```bash
cat docs/security/trusted_attestors.json
```
*Note: In this proof, `summit-auditor-1` is the active authority.*

### B. Generate a Test Attestation
Create a sample attestation file `artifacts/attestations/inbox/audit_test.attestation.json`:

```json
{
  "attestor": {
    "id": "summit-auditor-1"
  },
  "scope": {
    "artifacts": [
      {
        "path": "dist/release/bundle.tar.gz",
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      }
    ]
  },
  "assertions": {
    "determinism_verified": true,
    "provenance_verified": true,
    "clean_execution": true
  },
  "timestamp": "2026-01-15T12:00:00Z",
  "signature": {
    "algorithm": "ed25519",
    "value": "MCowBQYDK2VwAyEAqmX7E/M+e4+M/5+fF8/9+G8+9+9+9+9+9+9+9+9+9+8="
  }
}
```

### C. Run Verification
Execute the verification script:
```bash
node scripts/ci/verify_external_attestation.mjs
```

### D. Expected Output
*   **Console:** `[PASS] audit_test.attestation.json` (or `FAIL` if signature invalid - note: the example key provided in `trusted_attestors.json` is a placeholder, so real crypto verification will fail unless a matching private key signed it. The script checks strictly.)
*   **Artifact:** `artifacts/attestations/verification_result.json` created.

## 4. Hash Verification
Ensure the verification logic correctly matches artifacts:
1.  Modify `artifacts/attestations/verification_result.json` to see the structure.
2.  The system strictly enforces that `attestor.id` exists in `trusted_attestors.json`.
