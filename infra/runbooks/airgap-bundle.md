# Air-Gapped Bundle Build & Offline Validation

This runbook walks through exporting IntelGraph into an air-gapped bundle, importing it into a disconnected `kind` cluster, and validating file-drop ingestion mode without egress.

## 1. Prerequisites

- Docker CLI with the target images cached or accessible via a staging registry.
- Helm 3.10 or later.
- `kind` v0.23+ (for offline test cluster).
- OpenSSL (for bundle signing).
- Optional: a PEM encoded private key stored at `~/.config/intelgraph/airgap-signing.pem`.

> ℹ️️ The build scripts never contact external endpoints other than the registries required to pull images when `SKIP_PULL=false`. Ensure staging hosts perform these pulls before entering a disconnected enclave.

## 2. Build the bundle

```bash
# Pull images ahead of time if necessary
export MANIFEST=infra/airgap/bundle.manifest.json
./infra/airgap/export_bundle.sh
```

Artifacts:

- `infra/airgap/dist/intelgraph-airgap-bundle.tgz`
- `infra/airgap/dist/intelgraph-airgap-bundle.tgz.sha256`
- Optional signature: `intelgraph-airgap-bundle.tgz.sig`
- Provenance ledger and resync manifest inside the archive under `ledger/`.

If you must skip network pulls (for example, when building inside a staging enclave) run:

```bash
SKIP_PULL=true ./infra/airgap/export_bundle.sh
```

The script assumes images already exist locally (`docker images` verifies this).

## 3. Import into a simulated air-gap

Create a fresh `kind` cluster and copy the bundle into the environment without network access.

```bash
kind delete cluster --name intelgraph-airgap || true
kind create cluster --name intelgraph-airgap --config infra/runbooks/kind-airgap-config.yaml
./infra/airgap/import_bundle.sh infra/airgap/dist/intelgraph-airgap-bundle.tgz
```

The import script loads Docker images, copies Helm packages into `./airgap-charts`, and places ledger files in the current directory.

## 4. Offline install

```bash
helm install intelgraph airgap-charts/intelgraph-*.tgz \
  --namespace intelgraph --create-namespace \
  --values infra/helm/intelgraph/values/airgap.yaml
```

Wait for all pods to report `Running`:

```bash
kubectl get pods -n intelgraph
```

No egress is configured beyond what Kubernetes requires for DNS within the cluster.

## 5. File-drop ingestion validation

1. Create the file-drop PVC:
   ```bash
   kubectl get pvc file-drop -n intelgraph
   ```
   The PVC should bind to the offline storage class defined in the overlay.
2. Copy a connector payload into the shared volume:
   ```bash
   kubectl -n intelgraph exec deploy/intelgraph-worker -- mkdir -p /var/intelgraph/dropbox/incoming
   kubectl cp samples/offline/ingest.zip intelgraph/intelgraph-worker-0:/var/intelgraph/dropbox/incoming/ingest.zip
   ```
3. Confirm ingestion without network access by watching the worker logs:
   ```bash
   kubectl logs -n intelgraph deploy/intelgraph-worker -f | grep "Processed file-drop payload"
   ```
4. Verify the provenance ledger:
   ```bash
   sha256sum --check intelgraph-airgap-bundle.tgz.sha256
   diff <(jq '.items | length' resync-manifest.json) <(jq '.charts | length + .images | length' provenance-ledger.json)
   ```

## 6. Provenance resynchronisation after reconnect

When connectivity is restored, generate a fresh bundle and compare manifests:

```bash
./infra/airgap/export_bundle.sh
python3 - <<'PY'
import json
with open('resync-manifest.json') as baseline, open('infra/airgap/dist/ledger/resync-manifest.json') as new:
    baseline_items = {item['sha256'] for item in json.load(baseline)['items']}
    new_items = {item['sha256'] for item in json.load(new)['items']}
    drift = new_items - baseline_items
    if drift:
        raise SystemExit(f"Unexpected digests detected: {sorted(drift)}")
    print('✅ provenance resynchronised')
PY
```

Document the run by capturing timestamps for each command and store screenshots of the healthy `kubectl get pods` output in the DR evidence vault.
