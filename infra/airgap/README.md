# IntelGraph Air-Gap Bundle Toolkit

This toolkit assembles everything required to deploy IntelGraph into disconnected environments. It produces a single archive that contains container images, Helm charts, the bundle manifest, and provenance artifacts. Use the provided export/import helpers so the only allowed egress is a signed bundle file.

## One-command bundle build

```bash
MANIFEST=infra/airgap/bundle.manifest.json ./infra/airgap/export_bundle.sh
```

The script calls `build_airgap_bundle.py` which will:

1. Package all charts specified in the manifest (with optional overlay values).
2. Pull and save the required container images.
3. Emit a provenance ledger and a resynchronisation manifest.
4. Create a gzipped archive alongside a `sha256` checksum and optional signature.

Set `SKIP_PULL=true` if images are already available locally. Provide `SIGNING_KEY=/path/to/private.pem` to produce an OpenSSL signature (`.sig`).

## Offline installation

Copy the archive into the air-gapped cluster, then run:

```bash
./infra/airgap/import_bundle.sh intelgraph-airgap-bundle.tgz
```

This loads the images, extracts Helm chart packages into `./airgap-charts`, and restores the provenance JSON files into the working directory for later verification.

## Provenance resynchronisation

The bundle includes two ledger files:

- `provenance-ledger.json` – generated digests for charts and images captured at export time.
- `resync-manifest.json` – compact digest list used when reconnecting to a networked environment.

`resync-manifest.json` is what downstream systems request after connectivity is restored; it can be compared with a freshly generated ledger to validate drift.

## File-drop ingestion

Connector pods already support file-drop ingestion under `CONNECTOR_INGEST_MODE=file-drop`. The air-gapped overlay injects a `PersistentVolumeClaim` named `file-drop` that backs `/var/intelgraph/dropbox`. Operators only need to copy zipped payloads into that directory; the connectors scan for new files every 60 seconds in offline mode. See `infra/runbooks/airgap-bundle.md` for validation steps.

## Provenance verification

Use `infra/airgap/verify_provenance.py` to compare the baseline resync manifest with a newly generated ledger.

```bash
python3 infra/airgap/verify_provenance.py resync-manifest.json infra/airgap/dist/ledger/resync-manifest.json
```

A non-zero exit code indicates drift.
