# Threat Model: Deterministic Build Attestation

This document outlines the threat model for the deterministic build attestation system used in Summit.

## 1. Scope
The attestation system computes deterministic hashes over inputs (source code, dependencies) and publishes them as evidence for every mainline build.

## 2. Threats

| ID | Threat | Description | Impact |
|----|--------|-------------|--------|
| T1 | Bucket Tampering | An attacker replaces the attestation at a stable key (e.g., `provenance/<sha>/attestation.json`) with a fraudulent one. | High - False provenance leading to untrusted code being deployed. |
| T2 | Credential Leakage | Long-lived cloud keys for bucket upload are leaked. | High - Unauthorised access to the artifacts bucket. |
| T3 | Provenance Confusion | The attestation doesn't match the actually built artifact due to non-determinism or build-time injection. | Medium - Loss of trust in the attestation system. |
| T4 | Multi-tenant Bleed | Evidence from one tenant/environment is written to another due to misconfigured prefixes. | Medium - Information leakage or evidence corruption. |
| T5 | Replay Attack | An old valid attestation is re-published for a new (compromised) SHA. | High - fraudulent validation of a malicious build. |

## 3. Mitigations

| Mitigation | Description | Targets |
|------------|-------------|---------|
| **OIDC Auth** | Use GitHub Actions OIDC to assume short-lived roles for bucket uploads, eliminating long-lived secrets. | T2 |
| **Least Privilege** | IAM/WIF roles are scoped strictly to the required bucket and prefix. | T2, T4 |
| **Bucket Versioning** | Enable versioning and Object Lock on the artifacts bucket to prevent overwrites and tampering. | T1, T5 |
| **Deterministic Builder** | Use `git ls-files` and manifest-based hashing to ensure attestation is 100% reproducible. | T3 |
| **Verification Gate** | CI gates recompute digests and verify the attestation before promoting any build. | T1, T3 |
| **Content-Addressable** | (Future) Move toward content-addressable storage for all evidence. | T1 |
| **Digital Signatures** | (Future) Sign attestations using Sigstore Cosign or DSSE envelopes. | T1, T5 |

## 4. Required IAM Scopes (Template)

### AWS
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": ["s3:PutObject", "s3:GetObject"],
            "Resource": "arn:aws:s3:::summit-artifacts/provenance/${github_sha}/*"
        }
    ]
}
```

### GCP
- **Role:** `roles/storage.objectCreator`
- **Condition:** `resource.name.startsWith("projects/_/buckets/summit-artifacts/objects/provenance/")`

## 5. Security Review Checklist (CI Changes)
- [ ] Does the change introduce non-deterministic fields (e.g., timestamps) into `attestation.json`?
- [ ] Does the workflow use OIDC for authentication?
- [ ] Are the IAM roles restricted to the minimum required prefix?
- [ ] Is the evidence ID stable and tied to the Git SHA?
