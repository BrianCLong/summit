# GA Evidence Collection

The `make ga` command (and `make ga-evidence`) produces a standardized evidence bundle located in `dist/evidence/<sha>`. This bundle is designed to be audit-ready, providing a complete snapshot of the compliance, security, and quality checks performed on the repository.

## Bundle Structure

```
dist/evidence/<sha>/
  meta.json               # Machine-readable metadata (repo, commit, build info)
  EVIDENCE_SUMMARY.md     # Human-readable summary
  checksums.sha256        # SHA256 checksums of all files in the bundle
  tests/
    unit/                 # JUnit XML reports from unit tests
    coverage/             # Code coverage reports
  security/
    pnpm-audit.json       # Dependency vulnerability audit
  sbom/
    sbom.cdx.json         # CycloneDX Software Bill of Materials
  build/
    build-metadata.txt    # Tool versions and build environment details
  logs/
    ga_report.json        # Detailed report from the GA Gate script
    ga_report.md          # Markdown report from the GA Gate script
```

## Running Locally

To generate the evidence bundle locally:

```bash
make ga
```

This will run the full GA Gate suite and then collect the evidence. The bundle is also compressed into a tarball at `dist/evidence-<sha>.tar.gz`.

To only collect evidence (assuming checks have run or you want to snapshot current state):

```bash
make ga-evidence
```

## CI Integration

In the CI pipeline (GitHub Actions), the `ga-gate` job runs `make ga` and uploads the evidence tarball as an artifact named `ga-evidence-<sha>`.

A summary of the evidence is posted to the GitHub Actions Job Summary.

## Verification

To verify the integrity of the evidence bundle:

1.  Download and extract the bundle.
2.  Navigate to the evidence directory.
3.  Run `sha256sum -c checksums.sha256`.

All files should report "OK".
