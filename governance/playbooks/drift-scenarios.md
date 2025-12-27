# Drift Scenarios (Simulation Runbook)

These scenarios intentionally introduce compliance drift to validate:

- detection (CI fails with actionable evidence),
- reasoning (clear root cause),
- remediation (minimal patch),
- verification (all checks green),
- documentation (incident record).

## Scenario A: OPA regression (container runs as root)

1. Edit the demo input in CI (or locally) to:
   ```json
   { "image": { "user": "root", "vulnerabilities": [] } }
   ```
2. Run:
   - `opa test governance/policies governance/tests -v`
3. Expect:
   - CI fails on OPA tests or eval output includes `container runs as root`.

Remediation:

- Change container to run as non-root.
- Update build artifacts / Dockerfile and re-run CI.

## Scenario B: Missing SBOM signature (cosign)

1. Delete `governance/sbom/demo-bom.spdx.json.sig` (if present) or modify the SBOM.
2. Flip enforcement to hard-fail:
   - set `REQUIRE_SBOM_SIGNATURE=1` in `.github/workflows/ci-governance.yml`
3. Expect:
   - CI fails in “SBOM signature gate”.

Remediation:

- Regenerate SBOM and sign it:
  - `cosign sign-blob --key <private-key> governance/sbom/demo-bom.spdx.json > governance/sbom/demo-bom.spdx.json.sig`

## Scenario C: Unsigned dependency added

1. Add a dep to a test input with `signed:false`.
2. Run:
   - `opa test governance/policies governance/tests -v`
3. Expect:
   - denial message `unsigned dep: <name>`.
