# Release Artifacts & Evidence Bundles

To ensure every release is auditable and reproducible, a strictly defined **Evidence Bundle** must accompany every build promoted beyond Canary.

## 1. Bundle Specification

The evidence bundle is a compressed archive (`tar.gz`) containing all data necessary to reconstruct the context of the release.

**Naming Convention**: `evidence-{component}-{version}-{sha}.tar.gz`

### Directory Structure

```text
evidence/
├── manifest.json              # Root metadata (Version, Timestamp, Builder)
├── sbom.spdx.json             # Software Bill of Materials (SPDX format)
├── provenance.intoto.json     # SLSA Level 3 Provenance Attestation
├── git/
│   ├── HEAD                   # Full commit hash
│   ├── changes.txt            # Diff stat since last release
│   └── commit-info.txt        # Full commit message and metadata
├── tests/
│   ├── junit.xml              # Aggregate test results
│   └── coverage-summary.json  # Code coverage metrics
├── governance/
│   ├── policy-results.json    # OPA policy evaluation output
│   └── approvals.json         # Signed approvals (if applicable)
└── checksums.sha256           # SHA256 hashes of all files in this bundle
```

## 2. Required Artifacts

| Artifact         | Format     | Purpose                                                | Mandatory? |
| ---------------- | ---------- | ------------------------------------------------------ | ---------- |
| **Manifest**     | JSON       | Machine-readable bundle metadata.                      | Yes        |
| **SBOM**         | SPDX-JSON  | Complete dependency tree for vulnerability scanning.   | Yes        |
| **Provenance**   | In-Toto    | Cryptographic proof of build server identity & inputs. | Yes        |
| **Git State**    | Text       | Traceability to source control.                        | Yes        |
| **Test Results** | JUnit/JSON | Proof that quality gates passed.                       | Yes        |
| **Policy Check** | JSON       | Proof that governance policies (OPA) passed.           | Yes        |
| **Signatures**   | Cosign     | Cryptographic signatures of the artifacts.             | Yes        |

## 3. Integrity & Verification

- **Hashing**: The `checksums.sha256` file must contain hashes for every other file in the bundle.
- **Signing**: The `evidence-bundle.tar.gz` itself must be signed. The signature is stored as a separate asset (`evidence-bundle.tar.gz.sig`) or attached via OCI registry metadata.
- **Storage**: Bundles are uploaded to:
  1.  GitHub Release Assets (Immutable history).
  2.  Internal Artifact Store (Long-term retention).

## 4. Generation Process

The generation is handled exclusively by the `release-evidence` CI workflow. Human modification of bundles after generation is strictly prohibited and invalidates the release.
