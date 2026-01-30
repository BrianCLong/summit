# Subsumption Bundle — Example

This example bundle is intentionally constrained to demonstrate the baseline contract for new ITEM intake.

## How to start a new ITEM bundle

1. Copy this folder to `subsumption/<item-slug>/`.
2. Update `manifest.yaml` with the ITEM title, links, and evidence IDs.
3. Ensure docs targets exist and add deny/allow fixtures.
4. Run:
   ```bash
   node scripts/ci/verify_subsumption_bundle.mjs subsumption/<item-slug>/manifest.yaml
   ```

## Fixtures

- `fixtures/deny/README.md`: must exist for deny-by-default behavior.
- `fixtures/allow/README.md`: must exist for minimal allow behavior.
