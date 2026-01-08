# Policy Dual-Control Demo

Demonstrates how the `intelgraph.policy.export.enhanced` OPA policy enforces dual control and step-up authentication for high-volume dataset exports.

## Assets

- Script: `scripts/demo/policy-dual-control.sh`
- Sample input: `evidence-bundles/demo/policy-dual-control-input.json`
- Sample evidence bundle: `evidence-bundles/demo/policy-dual-control-bundle.json`

## Prerequisites

- `opa` CLI available on `PATH`.
- `jq` CLI available on `PATH`.
- Run from the repo root (`/workspace/summit`).

## Run the demo

1. Execute the script:

   ```bash
   scripts/demo/policy-dual-control.sh
   ```

2. Observe the summaries emitted by the script:

   ```json
   [single-approver (expected: hold for dual control/step-up)]
   {
     "action": "deny",
     "allow": false,
     "required_approvals": ["dual-control"],
     "risk_assessment": {
       "requires_dual_control": true,
       "requires_step_up": true,
       "level": "high"
     },
     "next_steps": ["Complete step-up authentication"]
   }

   [dual-control (expected: allow with dual control recorded)]
   {
     "action": "allow",
     "allow": true,
     "required_approvals": ["dual-control"],
     "risk_assessment": {
       "requires_dual_control": true,
       "requires_step_up": true,
       "level": "high"
     },
     "next_steps": ["Export approved - proceed with download"]
   }
   ```

3. Review generated artifacts under `.demo/policy-dual-control/`:
   - `request.single-approver.json` — missing second approval and step-up verification.
   - `request.dual-control.json` — dual approvals + step-up ready to ship.
   - `decision.*.json` — policy decisions for each request.
   - `policy-dual-control-evidence.json` — ephemeral bundle for this run.

## Verify the sample evidence bundle

Use the provided bundle and input for offline verification:

```bash
# Confirm the input hash matches the sample bundle metadata
sha256sum evidence-bundles/demo/policy-dual-control-input.json
jq -r '.policy.inputSha256' evidence-bundles/demo/policy-dual-control-bundle.json

# Inspect the required approvals and risk assessment captured in the bundle
jq '.decision.required_approvals' evidence-bundles/demo/policy-dual-control-bundle.json
jq '.decision.risk_assessment' evidence-bundles/demo/policy-dual-control-bundle.json

# Compare the static bundle to a fresh run (differences should be timestamps only)
diff -u evidence-bundles/demo/policy-dual-control-bundle.json \
  .demo/policy-dual-control/policy-dual-control-evidence.json || true
```

Expected checks:

- Hash values agree between the input file and bundle metadata.
- `required_approvals` contains `dual-control` and `risk_assessment.requires_dual_control` is `true`.
- The fresh run only diverges on timestamps/temporary paths from the static sample.
