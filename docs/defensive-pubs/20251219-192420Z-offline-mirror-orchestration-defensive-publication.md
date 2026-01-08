# Defensive Publication: Offline Mirror Orchestration for Air-Gapped Installs

- **Timestamp (UTC):** 2025-12-19T19:24:20Z
- **Venue:** Summit defensive publication archive (public repo) and derivative export feed
- **Scope:** Algorithm for creating, signing, priming, and rolling back offline package mirrors for air-gapped deployments (npm/pnpm, Docker/OCI, and system packages)
- **Status:** Disclosed for prior art; designed for repeatable, deterministic mirrors

## Objectives

- Preserve supply-chain integrity in disconnected environments.
- Guarantee reproducible installs via content-hash pinning and deterministic manifests.
- Provide fast first-boot by priming caches with the minimal working set plus warm-path artifacts.
- Enable atomic rollback to a previously signed snapshot.

## Source Snapshot and Manifesting

1. **Harvest:** Pull artifacts from allowed upstreams (npm registry, OCI registry, OS repos) while online.
2. **Fingerprint:** For each artifact `a`, compute `sha256(a)` and store as `H_a`.
3. **Snapshot manifest:** Build `manifest.json` containing `{name, version, type, source, sha256, size, licenses, build-meta}`.
4. **Deterministic ordering:** Sort manifest lexicographically by `(type, name, version)` to ensure deterministic Merkle roots.
5. **Merkle root:** Compute `root = Merkle(manifest_entries)` to anchor signatures and rollback pointers.

## Signing Pipeline

```
for artifact in harvest:
  cosign sign --key airgap.key artifact
  attestments.append(generate_slsa_provenance(artifact, sha256))
cosign sign-blob --key airgap.key manifest.json
cosign sign-blob --key airgap.key merkle-root.txt
```

- Keys are kept inside an HSM-backed signer. Offline site verifies using public key + transparency log copy (rekor mirror) shipped with the bundle.

## Cache Priming Algorithm

We precompute the warm set by tracing dependency graphs and install telemetry from connected staging:

```
warm_set = head_dependencies(apps, depth=2)
promoted = warm_set ∪ hot_paths(last_30d_access_logs)
for pkg in promoted:
  stage_to_cache(pkg)
  record_cache_index(pkg, sha256(pkg))
```

- `stage_to_cache` stores tarballs/layers inside `/var/lib/airgap-cache` with deterministic paths `<type>/<name>/<version>/<sha256>/payload`.
- Hot OCI layers are converted to oci-archive format and indexed by digest for `ctr image import` consumption.

## Air-Gap Deployment Workflow

1. Transfer bundle via encrypted drive with `manifest.json`, `merkle-root.txt`, signatures, attestations, and caches.
2. On arrival, verify chain:
   - `cosign verify-blob` for manifest and Merkle root.
   - `sha256sum --check` over all artifacts.
   - `merkle-verify` to ensure manifest ordering matches `merkle-root.txt`.
3. Populate local registries:
   - `npm-cli mirror import manifest.json --cache /var/lib/airgap-cache`.
   - `registry-mgr load oci-archives/*.tar --dest harbor.local`.
   - `apt-ftparchive` rebuilds metadata for OS packages.
4. Lock registry to read-only; enable periodic integrity sweeps: `cron: merkle-verify && cosign verify` every 6 hours.

## Rollback Safety

- Each snapshot is stored as `{manifest, signatures, merkle-root, cache}` under `releases/<timestamp>`.
- To rollback, select prior release `r` and execute:

```
stop_updates()
set_active_symlink(releases/r)
registry-mgr reset --from releases/r/cache
re-enable_cosign_policy(r)
```

- Rollback is atomic because registries read from an immutable, content-addressed cache path; symlink flips are single syscalls.

## Drift and Tamper Detection

- A diff job computes `Δ = manifest_active ⊕ manifest_expected`; non-empty `Δ` triggers quarantine.
- Randomized byte-range sampling of cached blobs (5% per sweep) ensures large artifacts are not subtly corrupted.
- Provenance attestations are compared against SBOM expectations to detect build drift.

## Prior Art Claim

This publication discloses deterministic manifest generation, HSM-backed cosign signing of both artifacts and Merkle roots, cache priming via telemetry-derived warm sets, and atomic symlink-based rollbacks for offline mirrors. Archiving here establishes prior art for equivalent offline mirror orchestration schemes in air-gapped deployments.
