# MVP-4 GA Evidence Map

This map aligns GA claims with deterministic, auditable evidence that can be
verified under restricted execution profiles. It mirrors the verification
matrix in `docs/ga/MVP-4-GA-VERIFICATION.md` while providing operator-friendly
commands for quick proof.

## Scope

- **Release:** MVP-4 GA (v4.0.4)
- **Profile:** Restricted CI (no network listeners, deterministic commands)
- **Primary gate:** `make ga-verify`

## Truth Table (Claim → Evidence → Command)

| Claim                                             | Evidence                                                                                            | Command                                                                                            |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Accessibility + Keyboard Gate wiring present      | `e2e/a11y-keyboard/a11y-gate.spec.ts`, `.github/workflows/a11y-keyboard-smoke.yml`                  | `test -f e2e/a11y-keyboard/a11y-gate.spec.ts && test -f .github/workflows/a11y-keyboard-smoke.yml` |
| Demo Mode Hard Gate mapped & scoped               | `docs/ga/verification-map.json`, `testing/ga-verification/ga-features.ga.test.mjs`                  | `node --test testing/ga-verification/ga-features.ga.test.mjs`                                      |
| Rate Limiting contract evidence present           | `docs/API_RATE_LIMITING.md`                                                                         | `node --test testing/ga-verification/ga-features.ga.test.mjs`                                      |
| AuthN/AuthZ helper evidence present               | `docs/AUTHZ_IMPLEMENTATION_SUMMARY.md`                                                              | `node --test testing/ga-verification/ga-features.ga.test.mjs`                                      |
| Observability taxonomy evidence present           | `summit_observability/METRICS.md`, `summit_observability/LOGS.md`, `summit_observability/EVENTS.md` | `node --test testing/ga-verification/ga-features.ga.test.mjs`                                      |
| Data classification & governance evidence present | `docs/DATA_GOVERNANCE.md`                                                                           | `node --test testing/ga-verification/ga-features.ga.test.mjs`                                      |
| Policy preflight & receipts verification succeeds | `scripts/ga/verify-ga-surface.mjs`, `docs/ga/verification-map.json`, `PROVENANCE_SCHEMA.md`         | `node scripts/ga/verify-ga-surface.mjs`                                                            |
| Ingestion security hardening evidence present     | `docs/security/security-architecture-and-policies.md`                                               | `node --test testing/ga-verification/ga-features.ga.test.mjs`                                      |

## Restricted Profile Defaults

```bash
export CI=1 ZERO_FOOTPRINT=true NO_NETWORK_LISTEN=true
```

## Notes

- Tier A coverage (`pnpm run test:a11y-gate`) is intentionally scoped to a
  stable Playwright runtime. Use the commands above for fast proofs.
- Keep this map aligned with `docs/ga/verification-map.json` before release.
