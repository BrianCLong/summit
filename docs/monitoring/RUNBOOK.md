# Monitoring Runbook (Prometheus/Grafana)

## Targets
- Prometheus: internal only; scrape services; API at /api/v1
- Grafana: Viewer-only access; dashboards read-only; use folders for permissions

## Minimal Discovery
```bash
kubectl get ns
kubectl get svc -A | egrep -i 'prometheus|grafana'
helm -n monitoring ls
```

## Endpoints (private)
- If LoadBalancer present:
```bash
kubectl -n monitoring get svc prometheus-k8s grafana -o wide
```
- If ClusterIP, port-forward:
```bash
kubectl -n monitoring port-forward svc/prometheus-k8s 9090 &
kubectl -n monitoring port-forward svc/grafana 3000 &
# prom.endpoint: http://localhost:9090
# grafana.endpoint: http://localhost:3000
```

## Security
- Keep Prometheus non-public; restrict with NetworkPolicy (see policies/)
- Grafana Viewer: create viewer user or SSO group; lock folders to Viewer

## Troubleshooting
- Prom targets: /targets; logs for failed scrapes
- Dashboards not moving? Use synthetic load (k6 in compose) or port-forwarded traffic

