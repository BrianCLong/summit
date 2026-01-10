# MVP-4 GA Demo Runbook (Fast Proof)

This runbook provides a demo-day fast path for validating GA evidence without
full CI orchestration. It uses deterministic, restricted-profile commands.

## Preconditions

```bash
export CI=1 ZERO_FOOTPRINT=true NO_NETWORK_LISTEN=true
```

## Fast Proof Steps

1. **Confirm accessibility gate wiring**

   ```bash
   test -f e2e/a11y-keyboard/a11y-gate.spec.ts && test -f .github/workflows/a11y-keyboard-smoke.yml
   ```

2. **Run GA verification bundle (Tier B)**

   ```bash
   node --test testing/ga-verification/ga-features.ga.test.mjs
   ```

3. **Run policy preflight (Tier C)**

   ```bash
   node scripts/ga/verify-ga-surface.mjs
   ```

## Expected Outputs

- Node test output with all assertions passing.
- Policy preflight logs confirming schema validation success.

## Deferred Optional Proofs

These are optional in demo mode but required for a full release packet:

- `pnpm run test:a11y-gate` (Playwright runtime)
- `make ga-verify` (full GA evidence sweep)

## Evidence Capture

Record the following artifacts in the demo checklist:

- Terminal output from the commands above.
- Git SHA for the demo branch.
- Any deviations from the restricted profile (if required).
