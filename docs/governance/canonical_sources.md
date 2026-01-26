# Canonical Sources for Governance Artifacts

This document defines the single source of truth for critical governance artifacts in the Summit platform. All other implementations are considered deprecated and should be removed.

## 1. SBOM Generation
- **Canonical Script:** `scripts/compliance/generate_sbom.ts`
- **Output Location:** `.evidence/sbom.json`
- **Format:** CycloneDX v1.4 (JSON)
- **Trigger:** `npm run generate:sbom`

## 2. Provenance Attestation
- **Canonical Script:** `scripts/compliance/generate_provenance.ts`
- **Output Location:** `.evidence/provenance.json`
- **Format:** SLSA v1.1
- **Trigger:** `npm run generate:provenance`

## 3. Security Evidence
- **Canonical Script:** `scripts/security/evidence-pack.ts`
- **Output Location:** `.evidence/security/`
- **Trigger:** `npm run security:evidence-pack`

## 4. Governance Constraints
- **Canonical Definition:** `governance/constraints.yaml`
- **Verification Script:** `scripts/ci/verify_turn_7_compliance.sh`

## deprecation Policy
Any duplicate scripts found in `.ci/` or other directories must be removed. CI workflows must reference these canonical scripts.
