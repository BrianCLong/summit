# MVP4 GA Evidence Map

**Canonical Source**: `docs/ga/evidence_map.yml`.

This Markdown view is a rendered summary of the canonical YAML evidence map. Edit the YAML file
only, then refresh this view from that source of truth.

## How to verify evidence map completeness

```bash
node scripts/ci/verify_evidence_map.mjs
```

## Evidence Map Summary (Rendered)

| ID     | Claim                                                               | Scope    | Verify                                                 |
| ------ | ------------------------------------------------------------------- | -------- | ------------------------------------------------------ |
| ga-001 | Secure supply chain verification is enforced for release artifacts. | ga       | `bash scripts/ci/verify-sbom-signature.sh <IMAGE_REF>` |
| ga-002 | No critical vulnerabilities remain in the release target.           | security | `bash scripts/scan-vulnerabilities.sh`                 |
| ga-003 | Functional correctness is validated by automated tests.             | ga       | `pnpm test:unit`                                       |
| ga-004 | Policy compliance is enforced through governance checks.            | ga       | `npx tsx scripts/ci/evaluate-policies.ts`              |
| ga-005 | Immutable history is protected by provenance exports.               | ga       | `jq -e '.' provenance/export-manifest.json`            |
