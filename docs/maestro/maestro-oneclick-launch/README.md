# Maestro One-Click Launch

Single command to deploy **staging → production** and capture a full **witness** evidence bundle.

## Requirements

- `docker` (to resolve image digests when a tag is provided)
- `kubectl` with access to both clusters
- `kubectl argo rollouts` plugin
- `curl` (for Alertmanager/Grafana/Prometheus HTTP calls)

## Usage

```bash
unzip maestro-oneclick-launch.zip -d .
cd maestro-oneclick-launch

export STAGE_CONTEXT="uat-cluster"
export PROD_CONTEXT="prod-cluster"
export NAMESPACE="intelgraph-prod"
export ROLLOUT="maestro-server-rollout"
export IMAGE="ghcr.io/brianclong/maestro-control-plane:release-2025.09.03"  # or pinned digest

# Optional (recommended)
export ALERTMANAGER_URL="https://alertmanager.example.com"
export PROM_URL="https://prometheus.example.com"
export GRAFANA_URL="https://grafana.example.com"
export GRAFANA_API_TOKEN="grafana_pat_..."
# If your container name differs from 'server':
export CONTAINER_NAME="server"

# One-click deploy + witness (staging → production)
bash oneclick/launch.sh
# → Produces evidence-<ts>-stage/ and evidence-<ts>-prod/ + oneclick-evidence-<ts>.tar
```
