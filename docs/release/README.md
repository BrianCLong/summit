# Release Engineering

This directory contains documentation and specifications for the release process.

## Key Documents

* [Release Dashboard Spec](RELEASE_DASHBOARD_SPEC.md) - Specification for the automated release dashboard feed.
* [Evidence Bundles](evidence-bundles.md) - Documentation on the cryptographic evidence bundles generated for each release.
* [Release Train](RELEASE_TRAIN.md) - The release train schedule and policy.
* [SemVer Policy](SEMVER_POLICY.md) - Semantic Versioning policy.

## Release Dashboard

A non-sensitive, JSON-based Release Dashboard is automatically generated for every merge to main.
It is derived from the verified Evidence Bundle and provides a safe way to consume release status in internal tools.

### Artifact Location
The `release-dashboard.json` is uploaded as an artifact in the `Release Dashboard` workflow run.

### Verification
You can verify the dashboard locally by running:
```bash
npx tsx scripts/release/generate_release_dashboard.ts
```

See [RELEASE_DASHBOARD_SPEC.md](RELEASE_DASHBOARD_SPEC.md) for the full schema and details.
