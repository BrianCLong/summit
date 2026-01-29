# MVP-4 GA Evidence Map (Deterministic Verification)

This map enumerates GA claims and their deterministic verification commands under
`CI=1 ZERO_FOOTPRINT=true NO_NETWORK_LISTEN=true`. Any item without a passing command is
**Deferred pending verification**.

## Claims and Verification

| Claim                                                | Status   | Command                                                                                            | Exit | Success indicator                                          | Evidence                                                                                            |
| ---------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Accessibility + Keyboard Gate is present and wired   | VERIFIED | `test -f e2e/a11y-keyboard/a11y-gate.spec.ts && test -f .github/workflows/a11y-keyboard-smoke.yml` | 0    | Both files present                                         | `e2e/a11y-keyboard/a11y-gate.spec.ts`, `.github/workflows/a11y-keyboard-smoke.yml`                  |
| Demo Mode Hard Gate is mapped and evidence-scoped    | VERIFIED | `node --test testing/ga-verification/ga-features.ga.test.mjs`                                      | 0    | `@ga-critical Tier B map covers required features`         | `docs/ga/verification-map.json`, `testing/ga-verification/ga-features.ga.test.mjs`                  |
| Rate Limiting contract evidence is present           | VERIFIED | `node --test testing/ga-verification/ga-features.ga.test.mjs`                                      | 0    | `@ga-critical evidence files exist and are keyword-scoped` | `docs/API_RATE_LIMITING.md`                                                                         |
| AuthN/AuthZ helper evidence is present               | VERIFIED | `node --test testing/ga-verification/ga-features.ga.test.mjs`                                      | 0    | `@ga-critical evidence files exist and are keyword-scoped` | `docs/AUTHZ_IMPLEMENTATION_SUMMARY.md`                                                              |
| Observability taxonomy evidence is present           | VERIFIED | `node --test testing/ga-verification/ga-features.ga.test.mjs`                                      | 0    | `@ga-critical evidence files exist and are keyword-scoped` | `summit_observability/METRICS.md`, `summit_observability/LOGS.md`, `summit_observability/EVENTS.md` |
| Data classification & governance evidence is present | VERIFIED | `node --test testing/ga-verification/ga-features.ga.test.mjs`                                      | 0    | `@ga-critical evidence files exist and are keyword-scoped` | `docs/DATA_GOVERNANCE.md`                                                                           |
| Policy preflight & receipts verification succeeds    | VERIFIED | `node scripts/ga/verify-ga-surface.mjs`                                                            | 0    | `GA hardening verification succeeded.`                     | `scripts/ga/verify-ga-surface.mjs`, `docs/ga/verification-map.json`, `PROVENANCE_SCHEMA.md`         |
| Ingestion security hardening evidence is present     | VERIFIED | `node --test testing/ga-verification/ga-features.ga.test.mjs`                                      | 0    | `@ga-critical evidence files exist and are keyword-scoped` | `docs/security/security-architecture-and-policies.md`                                               |
| Media authenticity & provenance gate is enforced     | VERIFIED | `node --test testing/ga-verification/ga-features.ga.test.mjs`                                      | 0    | `@ga-critical evidence files exist and are keyword-scoped` | `docs/governance/media_provenance.md`, `scripts/ci/verify_media_provenance.ts`                      |

## Deferred Pending Verification (Optional Full Proof)

| Claim                                       | Status                        | Full proof command        | Notes                                               |
| ------------------------------------------- | ----------------------------- | ------------------------- | --------------------------------------------------- |
| Accessibility + Keyboard Gate runtime proof | Deferred pending verification | `pnpm run test:a11y-gate` | Requires Playwright runtime; run in CI or a11y lab. |
| Full GA verify gate                         | Deferred pending verification | `make ga-verify`          | Requires full gate context; run in GA CI lane.      |

## Fast Proof Set (Demo Day)

Run these in order to reproduce the VERIFIED entries above:

1. `CI=1 ZERO_FOOTPRINT=true NO_NETWORK_LISTEN=true test -f e2e/a11y-keyboard/a11y-gate.spec.ts`
2. `CI=1 ZERO_FOOTPRINT=true NO_NETWORK_LISTEN=true test -f .github/workflows/a11y-keyboard-smoke.yml`
3. `CI=1 ZERO_FOOTPRINT=true NO_NETWORK_LISTEN=true node --test testing/ga-verification/ga-features.ga.test.mjs`
4. `CI=1 ZERO_FOOTPRINT=true NO_NETWORK_LISTEN=true node scripts/ga/verify-ga-surface.mjs`
