# License/Authority Compiler (LAC) and Proof-Carrying Analytics (PCA)

## Overview

The LAC-PCA system ensures that all data access and exports within the platform are compliant with active legal and license policies. It enforces these policies at query time (the **LAC** gate) and attaches cryptographic proofs of compliance to exported artifacts (the **PCA** manifest).

## 1. Concepts

### Policies
*   **Authority**: Legal basis for access (e.g., Warrant, Subpoena).
*   **License**: contractual constraints on data usage (e.g., "Internal Use Only", "No Export").
*   **Purpose**: The declared intent for a session or case.

### Components
1.  **Policy Compiler**: Deterministically transforms high-level policy documents into a lightweight JSON Intermediate Representation (IR).
2.  **Runtime Gate**: An Apollo Server plugin that evaluates the IR against every incoming GraphQL operation.
3.  **Provenance Manifest**: A cryptographically signed JSON document accompanying every export, proving which policies authorized the data release.

## 2. Threat Model

| Threat | Mitigation |
|Str|Str|
| **Missing Warrant** | Gate denies access if no active `Authority` matches the scope. |
| **Expired License** | Compiler checks `effectiveTo` dates; Gate blocks access. |
| **Data Leak (Export)** | License constraints (e.g., `revocations: ['export']`) flip `exportAllowed` bit in IR. |
| **Tampered Export** | Manifest includes Merkle root of inputs and policy hash; verifier detects mismatch. |

## 3. Usage

### Verifying an Export
Use the `verify-manifest` tool to validate a downloaded bundle:

```bash
./bin/verify-manifest path/to/manifest.json
```

### Adding a Policy
(Future) Use the Policy Management UI or API to upload signed policy documents.

## 4. Policy IR Spec (v1.0)

```json
{
  "version": "1.0.0",
  "hash": "sha256...",
  "allowedEntities": ["*"],
  "deniedSelectors": ["source:darkweb"],
  "retentionLimit": 2592000,
  "exportAllowed": false
}
```

## 5. Troubleshooting "POLICY_BLOCKED"

*   **"Export denied by active license"**: One of the active licenses on the data source revokes the `export` grant. Check `Internal-Research-DP-2025`.
*   **"Source prohibited"**: An authority (e.g., OFAC) explicitly bans this source.
*   **"Missing Purpose"**: The client did not provide an `x-purpose` header.
