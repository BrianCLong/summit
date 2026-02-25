> Owner: @summit/governance
> Last-Reviewed: 2026-02-25
> Evidence-IDs: EVD-PLACEHOLDER
> Status: active


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
