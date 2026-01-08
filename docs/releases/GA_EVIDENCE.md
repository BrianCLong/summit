# GA Evidence Guide

This document describes the **Release Hardening** evidence process. Every GA release candidate must produce a deterministic evidence bundle using the `make ga-validate` command.

## Evidence Bundle Structure

The evidence bundle is generated in `artifacts/ga-evidence/<YYYY-MM-DD>/<SHORT_SHA>/`.

| File | Description |
| :--- | :--- |
| `summary.json` | JSON summary of the validation run (Status, Steps, Env, SHA). |
| `diagnostics.log` | Output of environment diagnostics (`node -v`, `pnpm -v`, etc.). |
| `environment.json` | Snapshot of environment variables (secrets redacted). |
| `typecheck.log` | Output of `pnpm typecheck`. |
| `lint.log` | Output of `pnpm lint`. |
| `build.log` | Output of `pnpm build`. |
| `unit_tests.log` | Output of server unit tests. |
| `smoke.log` | Output of `pnpm ga:smoke`. |

## Generating Evidence

To generate the evidence bundle locally:

```bash
make ga-validate
```

Or, using the alias:

```bash
make ga-evidence
```

## CI Enforcement

The CI workflow `ga-hardened.yml` runs this validator on every push to release branches. The evidence bundle is uploaded as a workflow artifact.

## Auditing

To audit a release:
1. Locate the evidence bundle for the commit SHA.
2. Verify `summary.json` shows `"status": "PASS"`.
3. Check `environment.json` for expected configuration.
4. Review logs for any warnings or anomalies.
