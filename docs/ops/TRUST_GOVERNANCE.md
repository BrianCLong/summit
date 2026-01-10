# Trust & Governance Verification

## Release Bundle Verification
The MVP-4 Release Bundle serves as the authoritative definition of release integrity.
It is verified using a deterministic script that checks for the existence of required artifacts and the status of release gates.

### Manual Invocation
To verify the release bundle manually (e.g., before tagging a release):

```bash
node scripts/ops/verify_release_bundle.mjs --mode=hard
```

### Automation
This script is designed to be integrated into CI pipelines (`ci.yml` or `release-gate.yml`).
However, until all required verifier scripts are implemented, it must be invoked manually or in `report` mode to avoid blocking the pipeline.

### Required Gates
The following gates are checked by the verification script:
*   `scripts/ci/check_repo_hygiene.sh`
*   `scripts/ci/verify_evidence_map.mjs`
*   `scripts/ci/verify_security_ledger.mjs`
*   `scripts/ops/generate_trust_dashboard.mjs`

If any of these are missing, the script will WARN (in report mode) or FAIL (in hard mode) depending on the configuration in the bundle index.
