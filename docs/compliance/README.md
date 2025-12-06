# Federal Compliance & Security Documentation

## Executive Summary
Summit is designed from the ground up to operate within the most demanding security environments, from unclassified commercial clouds to air-gapped National Security Systems (NSS). This directory contains the artifacts and templates required for Authority to Operate (ATO) assessments.

## Contents

1.  [FedRAMP Compliance Pathway](./fedramp.md)
2.  [NIST 800-53 Control Mapping](./nist-800-53.md)
3.  [FIPS 140-3 Cryptography](./fips-crypto.md)
4.  [DoD Impact Levels (IL4/IL5/IL6)](./impact-levels.md)
5.  [ATO Package Template](./ato-template.md)

## Security Governance
Summit employs a "Security-as-Code" philosophy. All infrastructure is defined in Terraform with embedded policy-as-code checks (Rego/OPA) to ensure that no non-compliant resource can be deployed.

## Supply Chain Security
We adhere to **SLSA Level 3** standards:
*   **SBOM:** Software Bill of Materials generated for every build (CycloneDX format).
*   **Signing:** All container images and binaries are signed with Cosign.
*   **Provenance:** Complete build lineage is recorded in the immutable Provenance Ledger.
