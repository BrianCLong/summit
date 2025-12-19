# Summit Evidence Bundles

This guide explains how Summit automatically generates machine-verifiable evidence bundles and how auditors can review them for SOC 2, ISO 27001, and government procurement packages.

## What gets generated

Evidence bundles live under `artifacts/evidence/` and are named `evidence-<short-sha>-<timestamp>`. Each bundle contains:

- **GA gate report** (`ga-gate-report.json`): Pass/fail status plus any missing components.
- **CI metadata** (`ci/metadata.json`): Run IDs, workflow/job names, actor, ref, and URLs.
- **SBOMs** (`sboms/*.json`): SPDX/CycloneDX inventories for shipped components.
- **Provenance** (`provenance.json`): Builder identity, commit, branch, and workflow context.
- **SLO config + snapshot** (`slo/config.yaml`, `slo/snapshot.json`): Declared objectives and capture of the evaluated config.
- **LLM policy config** (`llm/policy.yaml`): Effective AI/LLM guardrail configuration.
- **Multi-tenant controls summary** (`controls/multi-tenant-summary.json`): Isolation, authentication, residency, and monitoring controls.
- **Control mapping** (`controls/control-mapping.md`): Summit controls mapped to SOC2/ISO 27001 families.
- **Manifest** (`manifest.json`, `manifest.sha256`): File inventory with SHA-256 digests plus a hash of the manifest itself.

## How generation works

1. The workflow `.github/workflows/evidence-bundles.yml` runs on `main` and GA tags.
2. It calls `ts-node --esm scripts/ops/generate-evidence-bundle.ts`, which:
   - Collects required inputs (SLO config, LLM policy, control mapping, provenance).
   - Writes files into a timestamped bundle directory under `artifacts/evidence/`.
   - Hashes every file, emits `manifest.json`, and writes `manifest.sha256`.
   - Fails if any required component is missing.
3. The workflow verifies the manifest hash and uploads the bundle as a GitHub Actions artifact (no external storage or SaaS).

## What each artifact proves

- **GA gate report**: Evidence bundle completeness and gate verdict for the commit/tag.
- **CI metadata**: Traceability to the exact workflow execution.
- **SBOMs**: Supply-chain inventory for dependency review.
- **Provenance**: Builder identity and source reference for SLSA-style attestations.
- **SLO config/snapshot**: Reliability objectives and the evaluated configuration at generation time.
- **LLM policy**: Applied AI/LLM guardrails and provider settings.
- **Multi-tenant controls**: Isolation, residency, network, and auditing controls for shared environments.
- **Control mapping**: Alignment of Summit controls to SOC2 and ISO 27001 families.
- **Manifest**: Immutable inventory with SHA-256 digests for all bundle contents.

## Auditor review checklist

1. Download the bundle artifact for the target commit or GA tag.
2. Verify manifest integrity: `cd bundle && sha256sum -c manifest.sha256`.
3. Spot-check hashes for critical files (e.g., SBOMs, provenance): `sha256sum <path>` and compare to `manifest.json`.
4. Confirm `ga-gate-report.json.status` is `pass` and `missingComponents` is empty.
5. Validate control coverage:
   - `controls/control-mapping.md` for SOC2/ISO 27001 alignment.
   - `controls/multi-tenant-summary.json` for isolation and residency.
   - `slo/config.yaml` + `slo/snapshot.json` for reliability governance.
6. Confirm provenance metadata matches the expected commit/tag and workflow URL.

## Local generation

```bash
# From repo root
pnpm install --frozen-lockfile
pnpm run evidence:generate
# Bundles are written to artifacts/evidence/
```

Optional overrides (environment variables):

- `EVIDENCE_OUTPUT_ROOT`, `EVIDENCE_TIMESTAMP`, `EVIDENCE_COMMIT_SHA`, `EVIDENCE_BRANCH`
- `CONTROL_MAPPING_PATH`, `SLO_CONFIG_PATH`, `SLO_SNAPSHOT_PATH`, `LLM_POLICY_PATH`, `MULTI_TENANT_SUMMARY_PATH`, `PROVENANCE_PATH`
- `EVIDENCE_SBOM_PATHS` (comma-separated), `PACKAGE_JSON_PATH`, `GA_GATE_NOTES`

