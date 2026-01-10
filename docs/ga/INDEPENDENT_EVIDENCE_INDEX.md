# Independent Evidence Index

**Purpose:** Map high-level GA claims to concrete, independently verifiable evidence paths.

| Claim | Evidence Path | Verification Command | Expected Indicator |
| :--- | :--- | :--- | :--- |
| **Accessibility Gate** | `e2e/a11y-keyboard/a11y-gate.spec.ts` | `pnpm run test:a11y-gate` | `passed` in Playwright output |
| **Demo Mode Gate** | `testing/ga-verification/ga-features.ga.test.mjs` | `pnpm ga:verify` | Test suite pass |
| **Rate Limiting Policy** | `docs/API_RATE_LIMITING.md` | `node scripts/ga/verify-ga-surface.mjs` | File existence checked |
| **AuthZ Implementation** | `docs/AUTHZ_IMPLEMENTATION_SUMMARY.md` | `node scripts/ga/verify-ga-surface.mjs` | File existence checked |
| **Observability Taxonomy** | `summit_observability/METRICS.md` | `node scripts/ga/verify-ga-surface.mjs` | File existence checked |
| **Data Governance** | `docs/DATA_GOVERNANCE.md` | `node scripts/ga/verify-ga-surface.mjs` | File existence checked |
| **Policy Preflight** | `PROVENANCE_SCHEMA.md` | `node scripts/ga/verify-ga-surface.mjs` | Schema validation pass |
| **Ingestion Security** | `docs/security/security-architecture-and-policies.md` | `node scripts/ga/verify-ga-surface.mjs` | File existence checked |
| **Secure Supply Chain** | `provenance/slsa-attestation.json` | `cosign verify ...` (Manual) | Signature valid |
| **No Critical Vulns** | `sbom/*.json` | `pnpm audit` | Zero criticals |
| **Immutable History** | `ledger/provenance-log.sig` | N/A (Requires keys) | N/A |

*Note: Some evidence requires manual verification or specific tooling (Cosign, OPA) if not included in the standard `pnpm` dev dependencies.*
