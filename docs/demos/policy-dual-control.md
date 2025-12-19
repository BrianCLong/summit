# Policy Dual-Control Demo

Demonstrates the dual-control gate for policy changes: preflight validation, sequential approvals,
execution, and the final receipt/export.

## Prerequisites

- `bash`, `python3`, and `jq` available on your PATH
- Repository checkout (the script reads git metadata for the receipt)

## Run the demo

Execute the helper script from the repo root:

```bash
scripts/demo/policy-dual-control.sh
```

### Expected output

```
[YYYY-MM-DDTHH:MM:SSZ] Preflight: generating request and validating JSON
[YYYY-MM-DDTHH:MM:SSZ] Preflight: capturing repository context
[YYYY-MM-DDTHH:MM:SSZ] Approvals: drafting dual-control signatures
[YYYY-MM-DDTHH:MM:SSZ] Execution: simulating change rollout
[YYYY-MM-DDTHH:MM:SSZ] Receipt: exporting bundle with digests
[YYYY-MM-DDTHH:MM:SSZ] Done. Bundle ready at evidence-bundles/demo/policy-dual-control-bundle.json
```

The timestamps will reflect your local run, and the git metadata will use your current branch/commit.

## Artifacts produced

- `evidence-bundles/demo/policy-dual-control-bundle.json` – consolidated receipt with preflight,
  approvals, execution, and digests.
- `evidence-bundles/demo/runtime/` – stage payloads (`request.json`, `preflight.json`,
  `approvals.json`, `execution.json`).

## Verify the evidence bundle

```bash
# Validate the recorded digests against the runtime files
jq -r '.artifacts[] | "\(.sha256)  \(.path)"' \
  evidence-bundles/demo/policy-dual-control-bundle.json | sha256sum --check

# Inspect the stage payloads inline from the bundle
jq '.stages' evidence-bundles/demo/policy-dual-control-bundle.json
```

## What to look for

- **Preflight** – JSON validation noted under `stages.preflight.validations` with the request hash.
- **Approvals** – Two approvals captured with roles and timestamps under `stages.approvals`.
- **Execution** – Result set to `success` with the rollout plan listed.
- **Receipt/Export** – `artifacts` array lists every stage file and its SHA-256 digest for
  reproducible verification.
