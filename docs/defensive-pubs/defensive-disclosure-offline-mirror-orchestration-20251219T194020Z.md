# Defensive Publication: Offline Mirror Orchestration for Air-Gapped Installs

- **Timestamp (UTC):** 2025-12-19T19:40:20Z
- **Intended venue:** IP.com defensive publication (or equivalent public prior-art repository). External submission is required outside this environment.
- **Scope:** Offline mirror builder that packages, signs, transports, and rolls back package sets for air-gapped IntelGraph deployments.

## Objectives

1. Provide deterministic, replayable mirrors for package managers (pnpm/npm, pip, OS packages, container registries) without external network access.
2. Guarantee authenticity via layered signing (root + target keys) and provenance manifests.
3. Prime caches to avoid first-run latency spikes.
4. Enable fast rollback to the last known-good snapshot with minimal operator steps.

## System Roles & Artifacts

- **Planner:** Computes manifest of required artifacts (packages, OCI images, SBOMs) from an input lockfile set.
- **Signer:** Holds offline root key; issues time-bound target keys for each export batch.
- **Stager:** Builds the portable mirror bundle and primes caches.
- **Deployer:** Applies bundles into the air-gapped registry/filesystem; triggers integrity verification.
- **Artifacts:** `mirror-manifest.json`, `targets/` directory with hashed payloads, `snapshot.json`, `root.json`, `timestamp.json`, `sbom.json`, `rollback-journal.ndjson`.

## Algorithm (Planner + Stager)

1. **Input:** Lockfiles (`pnpm-lock.yaml`, `requirements.txt`), image list (`oci-images.txt`), OS package list, and a target platform matrix.
2. **Dependency expansion:**
   - Parse lockfiles and compute closure of transitive dependencies.
   - For each artifact, compute SHA-256 digest and size; store as `manifest.entries[i]`.
3. **Chunking:** Group artifacts into bundles (default 2 GiB) for transport media; maintain `bundle_index` mapping artifact → bundle ID.
4. **Signing workflow (TUF-inspired):**
   - `root.json` signed with offline root key (rotated yearly).
   - `targets.json` contains hashes/sizes for every artifact and bundle; signed with batch-specific target key (rotated per export).
   - `snapshot.json` tracks versions of root/targets; `timestamp.json` pins snapshot freshness (validity ≤ 7 days to discourage stale bundles).
5. **Cache priming:**
   - Build warmed tarballs for pnpm store (`.pnpm-store/v3`), pip wheels, and OCI layers.
   - Generate `cache-seeds/` with pre-extracted file trees for hot paths (GraphQL schemas, MUI assets).
6. **Integrity sealing:** For each bundle, compute Merkle root over ordered artifact hashes; store in `targets.json` and as QR-friendly short code for manual verification.
7. **Export packaging:** Emit `mirror-YYYYMMDDTHHMMSSZ.tar.zst` containing bundles, metadata, and a `VERIFY.sh` script that performs:
   - Hash verification (Merkle + SHA-256).
   - Signature verification (root + targets).
   - SBOM diff against previous snapshot (fails on downgraded critical vulns unless `--allow-downgrade` is set).

### Pseudocode (Planner)

```
def plan_mirror(lockfiles, image_list):
    deps = resolve_dependencies(lockfiles)
    artifacts = deps + fetch_image_layers(image_list)
    entries = [HashInfo(path=a.path, sha256=hash(a)) for a in artifacts]
    bundles = chunk(entries, size_gib=2)
    targets = {e.path: {"sha256": e.sha256, "bundle": bundle_id(e)} for e in entries}
    manifest = {"created": now(), "entries": targets, "bundles": bundles}
    write(manifest, "mirror-manifest.json")
```

### Pseudocode (Stager + Deployer)

```
def stage(manifest):
    root = sign_root_if_needed()
    targets = sign_targets(manifest.entries)
    snapshot = sign_snapshot(root, targets)
    timestamp = sign_timestamp(snapshot)
    build_cache_seeds(manifest)
    export_bundle(manifest, root, targets, snapshot, timestamp)


def deploy(bundle, dest):
    verify_bundle(bundle)
    unpack(bundle, dest)
    prime_caches(dest.cache_seeds)
    publish_oci(dest.registry, dest.oci_layers)
    publish_packages(dest.package_repo)
    record_success(bundle.id)
```

## Rollback Safety

- **Versioned snapshots:** Each deploy writes `rollback-journal.ndjson` with `{bundle_id, root_version, targets_version, sha256, deployed_at}`.
- **Atomic swap:** Deploy to a staging path (`/var/lib/intelgraph-mirror/.staged`) and use a symlink flip to activate; rollback is a single symlink revert.
- **Retention policy:** Keep the last 3 successful bundles; prune older ones unless flagged `hold_for_forensics`.
- **Cross-check:** On rollback, re-run `VERIFY.sh` against the retained bundle before activation; refuse rollback if signatures do not validate.

## Operational Cadence

- **Export frequency:** Weekly for stable channels; daily for hotfix channels. Exports embed CVE window they were checked against.
- **Key rotation:** Root yearly; target per export; timestamp daily. All keys are stored in an HSM or offline smartcard; exports include cert chains for audit.
- **Air-gap transfer:** Supports USB, DVD, or one-time network bridge; bridge mode enforces rate limits and requires TLS mutual auth with short-lived client certs.

## Publication & Prior-Art Positioning

- Establishes prior art for a mirror orchestration pipeline combining TUF-style signing, cache priming for pnpm/pip/OCI, Merkle-sealed bundles, and atomic rollback for air-gapped deployments.
- External upload is required to complete publication; this document contains all algorithmic details needed for public disclosure without proprietary secrets.
