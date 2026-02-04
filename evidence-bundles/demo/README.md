# Policy Dual-Control Demo Evidence

This folder contains a sample evidence bundle produced by `scripts/demo/policy-dual-control.sh`.
The bundle captures the full flow: preflight, dual approvals, execution, and the exported receipt.

## Files

- `policy-dual-control-bundle.json` – bundled receipt with stage payloads and digests.
- `runtime/` – stage-level JSON payloads referenced by the bundle.

## Verify the bundle

1. Generate expected hashes from the bundle and compare them against the stage files:
   ```bash
   jq -r '.artifacts[] | "\(.sha256)  \(.path)"' evidence-bundles/demo/policy-dual-control-bundle.json \
     | sha256sum --check
   ```
2. Validate the stage order and request ID:
   ```bash
   jq '.requestId, .stages | keys' evidence-bundles/demo/policy-dual-control-bundle.json
   ```
3. Regenerate the bundle (optional) to see a fresh run with current git metadata:
   ```bash
   scripts/demo/policy-dual-control.sh
   ```

The bundle is intentionally lightweight so it can be verified without external services.
