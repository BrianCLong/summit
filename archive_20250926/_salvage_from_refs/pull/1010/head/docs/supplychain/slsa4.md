# SLSA-4 Supply Chain

## Hermetic Runner
- Builds executed in isolated runner with no network access.
- All dependencies pinned via lockfiles.

## Provenance
- in-toto attestations generated for each publisher bundle.
- Dual signatures (EC + PQC) attached with cosign.
- Provenance digest anchored in transparency log.

## Verification
- CI checks provenance and SBOM at submission.
- Drift or unsigned bundles block release.
