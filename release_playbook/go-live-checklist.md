# T-0 → T+24h Go-Live Checklist

Run either `make release-ga` or `./release_playbook/ga.sh` to kick things off, then use the blocks below.

## T-0 (before hitting the button)

```bash
# sanity: required tools & vars
command -v gh helm kubectl conftest cosign >/dev/null
gh variable get STAGE_URL -q .value >/dev/null
gh variable get PROD_URL  -q .value >/dev/null

# cluster readiness (prod namespace + flagger objects)
NS=intelgraph
kubectl get ns "$NS"
kubectl -n "$NS" get canary intelgraph -o wide
```

**Gate:** both repo vars present; canary/intelgraph exists and Ready; Kyverno policies Enforce.

## T-0: Launch GA run

```bash
make release-ga
# or:
./release_playbook/ga.sh
```

The script will: merge PR → policy render → cosign verify → trigger prod canary (10%) → tag → release → write evidence MD.

## Live monitoring (while canary runs)

```bash
# Flagger events (live)
NS=intelgraph; CANARY=intelgraph
kubectl -n "$NS" get events \
  --field-selector involvedObject.kind=Canary,involvedObject.name="$CANARY" --watch

# Canary status loop
watch -n 10 "kubectl -n $NS get canary $CANARY -o wide"

# Prometheus quick probes (requires in-cluster access)
PROM_PF_NS=monitoring
kubectl -n "$PROM_PF_NS" port-forward svc/prometheus-operated 9090:9090 >/dev/null 2>&1 &
PROM_URL=http://127.0.0.1:9090
curl -sG "$PROM_URL/api/v1/query" --data-urlencode
 'query=histogram_quantile(0.95, sum by (le) (rate(http_server_request_duration_seconds_bucket{job=~"intelgraph.*"}[10m])))'
curl -sG "$PROM_URL/api/v1/query" --data-urlencode
 'query=sum(rate(http_requests_total{status=~"5..",job=~"intelgraph.*"}[10m]))/sum(rate(http_requests_total{job=~"intelgraph.*"}[10m]))'

# App smoke (prod)
npm -g i k6 >/dev/null 2>&1 || true
k6 run maestro/tests/k6/smoke.js -e BASE_URL="$PROD_URL" -e STAGE=prod -e COMMIT="$(git rev-parse --short HEAD)"
```

**Gates per step:** p95 < 1.5s; 5xx < 1%; no CrashLoop; Flagger analysis progressing.

## Rollback (only if gates breach)

```bash
# If still in canary, Flagger auto-rolls back—just monitor.
# If already promoted to primary:
NS=intelgraph
helm history intelgraph -n "$NS"
helm rollback intelgraph $(helm history intelgraph -n "$NS" | awk 'NR==2{print $1}') -n "$NS"
```

Then confirm:

```bash
kubectl -n "$NS" get deploy,pods | grep intelgraph
```

## Evidence & release notes

The wrapper writes: `release_playbook/evidence/<GA_TAG>.md`.
Add links/screenshots to:

- Flagger events & final phase
- Grafana golden dashboards
- Prometheus alert history (burn-rate test)
- Cosign verify output (already captured)
- SBOM attachments on the GitHub Release

## T+1h / T+24h quick checks

```bash
# confirm Flagger completed to 100%
kubectl -n intelgraph get canary intelgraph -o jsonpath='{.status.phase}{"\n"}'

# review SLO burn & alerts
# (use Grafana/Prometheus UI; capture screenshots for the evidence MD)

# scan release images again (belt & suspenders)
trivy image --severity CRITICAL --exit-code 1 ghcr.io/brianclong/intelgraph:v2025.09.19-ga
```

## Comms snippet (paste to #releases)

> IntelGraph GA v2025.09.19-ga is live via Flagger canary: 10% → 50% → 100% passed SLO gates (p95 < 1.5s, 5xx < 1%).
> Signed images (Cosign), SBOM (SPDX/CycloneDX) attached. Runbooks + evidence: `release_playbook/evidence/v2025.09.19-ga.md`.
> Rollback verified. Monitoring on-call for 24h.

```

```
