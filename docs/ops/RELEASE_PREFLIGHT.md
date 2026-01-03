# Release Preflight

The **Release Preflight** is a mandatory gate for all production releases. It enforces strict parity with CI checks and produces an immutable evidence pack.

## Quick Start

Run the preflight check locally before submitting a PR or tagging a release:

```bash
pnpm release:preflight
```

This will:
1.  Run the full [Release Parity Chain](./RELEASE_PARITY_CHAIN.md).
2.  Generate an [Evidence Pack](./EVIDENCE_PACKS.md) in `evidence/release-preflight/`.
3.  Exit with `0` (Success), `1` (P0 Failure), or `2` (P1 Warning).

## Offline Mode

For debugging or rapid iteration without running full commands, you can use offline mode with fixtures:

```bash
pnpm release:preflight:offline
```

## Interpreting Results

- **✅ PASS (Exit Code 0):** No P0 or P1 issues found. Safe to proceed.
- **🛑 FAIL (Exit Code 1):** P0 issues detected (e.g., build failure, test failure). **Blocking.**
- **⚠️ WARNING (Exit Code 2):** P1 issues detected (e.g., flakiness signatures, hygiene). **Requires waiver.**

## Evidence Submission

Copy the contents of the generated `summary.md` into your Pull Request description.

See [Evidence Packs](./EVIDENCE_PACKS.md) for details on the artifact structure.
