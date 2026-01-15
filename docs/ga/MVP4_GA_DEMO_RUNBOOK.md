# MVP-4 GA Demo Runbook (Deterministic Proof)

This runbook provides fast, deterministic verification steps suitable for GA demo day. Commands are scoped to `CI=1 ZERO_FOOTPRINT=true NO_NETWORK_LISTEN=true`.

## Preflight

```bash
export CI=1
export ZERO_FOOTPRINT=true
export NO_NETWORK_LISTEN=true
```

## Fast Proof Steps

1. Verify accessibility gate wiring (file presence).

```bash
test -f e2e/a11y-keyboard/a11y-gate.spec.ts
test -f .github/workflows/a11y-keyboard-smoke.yml
```

Expected: exit code `0` for both commands.

2. Verify GA feature evidence map and keyword scoping.

```bash
node --test testing/ga-verification/ga-features.ga.test.mjs
```

Expected: `ok 1`, `ok 2`, `ok 3` in TAP output with exit code `0`.

3. Verify GA surface policy preflight.

```bash
node scripts/ga/verify-ga-surface.mjs
```

Expected: `GA hardening verification succeeded.` with exit code `0`.

## Optional Full Proof (Deferred pending verification)

These are runtime-intensive and should be run in the GA CI lane or a prepared environment.

```bash
pnpm run test:a11y-gate
make ga-verify
```

## If This Fails

- If `testing/ga-verification/ga-features.ga.test.mjs` fails, open `docs/ga/verification-map.json` and verify the referenced evidence file contains the keyword.
- If `scripts/ga/verify-ga-surface.mjs` fails, inspect missing evidence paths or required headings in `docs/ga/TESTING-STRATEGY.md` and `docs/ga/LEGACY-MODE.md`.
- If file existence checks fail, confirm the referenced path exists in the current checkout.
