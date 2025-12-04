# Synthetic Monitoring

This directory contains scripts and configuration for synthetic monitoring of the IntelGraph platform.

## Scripts

- `business_flow.js`: Simulates a critical user journey (Health Check -> Metrics Check -> Evidence Search).

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
