# Sovereign & Air-Gapped Deployment Strategy

> **Status:** DRAFT
> **Owner:** Sovereign & Air-Gapped Deployment Agent
> **Classification:** RESTRICTED / EXPORT CONTROLLED CONCEPTS
> **Parent:** `INSTITUTIONAL_STRATEGY.md`

## 1. Mission

To ensure Summit is deployable in **classified, sovereign, and disconnected environments** ("Summit runs where clouds cannot"). This capability is non-negotiable for institutional adoption in defense, intelligence, and critical infrastructure sectors.

## 2. Core Capabilities

### 2.1. Fully Air-Gapped Install Path

- **Zero-Internet Dependency:** The installation process must not require _any_ outbound network connection. All dependencies (containers, models, databases, libraries) must be bundled in a single "Summit Artifact Bundle" (SAB).
- **Sneakernet Updates:** Updates are delivered via physical media or one-way data diodes using signed patch bundles.
- **Local Registry:** The deployment includes a local OCI registry, PyPI mirror, and npm registry to serve the disconnected cluster.

### 2.2. Hardware-Backed Trust (TPM/HSM)

- **Root of Trust:** Summit binds its identity to the physical hardware using TPM 2.0 or dedicated HSMs (Hardware Security Modules).
- **Key Storage:** Long-term cryptographic keys (CA roots, signing keys) never leave the secure element.
- **Attestation:** The boot process validates the integrity of the hardware and software stack before unlocking the data volume (Measured Boot).

### 2.3. Deterministic Builds & Reproducibility

- **Bit-for-Bit Verification:** Clients must be able to independently build the Summit binaries from source code and verify they match the provided artifacts.
- **SBOM Integrity:** Every artifact includes a cryptographically signed Software Bill of Materials (SBOM) listing every single dependency and its hash.
- **Hermetic Build System:** The build pipeline runs in a strictly isolated environment with no network access, ensuring no unrecorded dependencies sneak in.

### 2.4. Jurisdictional Configuration Profiles

- **Data Residency:** Strict enforcement of where data can reside and flow, configurable per jurisdiction.
- **Compliance Presets:** "One-click" configuration profiles for common standards (e.g., "US-Federal-High", "EU-Sovereign", "UK-Official").
- **Language & Localization:** Full support for local languages and cultural norms in UI and reporting.

## 3. Deployment Playbooks

### Playbook A: "The Bunker" (Classified / Disconnected)

- **Target:** SCIFs, submarines, tactical edge nodes.
- **Method:** Physical media delivery of the SAB. Manual key ceremony.
- **Update Cycle:** Quarterly, via physical exchange.

### Playbook B: "The Sovereign Cloud" (National Gov / Regulated)

- **Target:** Government-only cloud regions (e.g., AWS GovCloud, Azure Sovereign).
- **Method:** Private link installation from a controlled bastion.
- **Update Cycle:** Monthly, via validated unidirectional gateway.

### Playbook C: "The Industrial Edge" (Critical Infrastructure)

- **Target:** Power plants, factories, autonomous systems.
- **Method:** Factory-provisioned hardware appliances.
- **Update Cycle:** Annual or on-demand security patches.

## 4. Compliance Checklist

- [ ] **FIPS 140-2/3:** All cryptographic modules must be FIPS validated.
- [ ] **Common Criteria:** Target EAL4+ certification for the core security kernel.
- [ ] **Supply Chain Security:** Adherence to SLSA Level 4 standards.

## 5. Verification Proofs

A "Reproducible Build Proof" package is delivered with every release, containing:

1.  Source code snapshot.
2.  Build environment definition (Dockerfile/Nix).
3.  Expected output hashes.
4.  Instructions for independent verification.
