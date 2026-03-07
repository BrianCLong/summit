# Runbook: OMB M-26-05 Risk-based Assurance

## Generating Evidence Pack Locally
To generate a full assurance bundle locally for testing or audit response:

```bash
mkdir -p dist/assurance/sbom dist/assurance/provenance dist/assurance/vuln
./scripts/assurance/generate_sbom.sh
./scripts/assurance/generate_provenance.sh
./scripts/assurance/collect_vuln_status.sh
./scripts/assurance/build_evidence_pack.sh
```

## Verifying a Pack
If you have received an `evidence-pack.tgz` from CI or a vendor:

```bash
./scripts/assurance/verify_evidence_pack.sh dist/assurance/evidence-pack.tgz
```

## Troubleshooting CI Failures
If the `Assurance Evidence Generation` workflow fails:
1. **SBOM Generation:** Check `package.json` for syntax errors.
2. **Provenance:** Ensure the git environment is available.
3. **Verification:** Check `index.json` against the schema in `schemas/assurance/`.

## Manual Overrides
Under M-26-05, some agencies may require additional enrichments. Use the optional flags in `generate_sbom.sh` to include license hashes if requested.
