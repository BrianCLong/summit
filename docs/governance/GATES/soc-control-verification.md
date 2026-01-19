Owner: Governance
Last-Reviewed: 2026-01-16
Evidence-IDs: soc-compliance-report
Status: active

# SOC Control Verification Gate

**Job:** SOC Control Tests
**Command:** `pnpm ci:soc-controls`
**Workflow:** `.github/workflows/compliance.yml`
**Evidence:** Control-map validation, governance rules verification, compliance drift detection

## What This Gate Checks

This gate validates SOC-control mappings and governance rules:

1. **Control Drift Detection** - Validates all artifacts referenced in `compliance/control-map.yaml` exist
2. **Governance Verification** - Ensures governance artifacts are present and structurally valid
3. **Compliance Drift Check** - Verifies evidence artifacts exist and are accessible
4. **SOC Report Tests** - Runs Python unit tests for SOC report generation

## Running Locally

```bash
# Run the full SOC-control test suite
pnpm ci:soc-controls

# Or run individual checks
pnpm compliance:check          # Control drift detection only
pnpm verify:governance         # Governance verification only
pnpm verify:compliance         # Compliance drift check only
pnpm test:soc-report          # SOC report tests only
```

## Extending Controls

To add or update controls:

1. Edit `compliance/control-map.yaml` to add new controls or update artifact references
2. Ensure all referenced artifacts exist in the repository
3. Run `pnpm ci:soc-controls` locally to validate
4. Add exceptions in `compliance/control-exceptions.yml` if needed (with owner and expiry)

## CI Integration

The SOC-control gate runs automatically on:
- Push to `main` branch
- Pull requests to `main`
- Weekly on Mondays (scheduled)

## Determinism Notes

All SOC-control tests produce deterministic output:
- No timestamps in test artifacts
- Stable file enumeration and sorting
- No network dependencies
- Reproducible across environments
