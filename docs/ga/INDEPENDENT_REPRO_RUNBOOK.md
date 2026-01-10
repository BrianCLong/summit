# Independent Reproduction Runbook

**Objective:** Verify Summit GA claims from a clean environment using a single entry point.

## Prerequisites

Ensure your environment meets the [Independent Repro Contract](INDEPENDENT_REPRO_CONTRACT.md).

```bash
node -v  # Expect v18.18+
pnpm -v  # Expect v9+ or v10+
```

## Primary Verification Command

To run the **Fast Proof Set** (verifies artifact integrity, documentation consistency, and policy mapping):

```bash
# 1. Install dependencies (requires network)
pnpm install --frozen-lockfile

# 2. Run the GA Verification Suite
pnpm ga:verify
```

### Success Indicators

1.  **Exit Code:** `0`
2.  **Output:**
    *   `Type check passed` (or similar from `tsc`)
    *   `Lint passed`
    *   `GA hardening verification succeeded.` (from `verify-ga-surface.mjs`)
    *   `Smoke tests not configured - add integration tests here` (Placeholder confirmation)

## Fallback: Minimal Integrity Check

If `pnpm install` fails or the environment is restricted (no network), use the minimal integrity check which requires only Node.js standard libraries:

```bash
node scripts/ga/verify-ga-surface.mjs
```

### Success Indicators

*   **Output:** `GA hardening verification succeeded.`

## Troubleshooting

*   **`pnpm` not found:** Enable via `corepack enable` or install globally `npm i -g pnpm`.
*   **Network errors:** Ensure access to standard npm registry.
*   **Platform errors:** Verify you are on Linux or macOS; Windows is not supported.

## Artifacts Verified

Executing this runbook validates:
1.  `docs/ga/verification-map.json` correctness.
2.  Existence of all Evidence Artifacts referenced in `GA_DEFINITION.md`.
3.  Consistency of Governance and Legacy Mode documentation.
4.  Codebase health (Lint/Types) - *Full mode only*.
