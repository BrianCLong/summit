# Synthetic Monitoring

This directory contains scripts and configuration for synthetic monitoring of the IntelGraph platform.

## Scripts

- `business_flow.js`: Simulates a critical user journey (Health Check -> Metrics Check -> Evidence Search).
- `bgp-reachability-probes.yaml`: Region/ASN probe target matrix and BYOIP coverage SLO inputs.

## Deployment

To deploy the synthetic check as a Kubernetes CronJob:

1. Create a ConfigMap with the script:
   ```bash
   kubectl create configmap synthetic-scripts --from-file=business_flow.js -n monitoring
   ```

2. Apply the CronJob:
   ```bash
   kubectl apply -f cronjob.yaml
   ```

## Configuration

- `API_URL`: The base URL of the IntelGraph API (default: `http://localhost:3000`).
- Probe labels required for routing visibility: `region`, `asn`, `provider`, `target`.
- Prometheus scrape job: `blackbox-routing` (configured in `monitoring/prometheus.yml`).

## Validation

Validate the routing probe matrix before rollout:

```bash
pnpm --dir monitoring/synthetic run validate:bgp-probes
```
