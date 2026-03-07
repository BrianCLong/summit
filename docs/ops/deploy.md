# Production Deployment Playbook

## Overview

This playbook describes the steps to deploy Summit GA to a production environment.

## Prerequisites

- **Access**: Kubernetes Cluster Admin access.
- **Artifacts**: A signed GA release bundle (e.g., `v1.0.0`).
- **Tools**: `kubectl`, `helm`, `cosign`.

## Deployment Steps

1.  **Verify Artifacts**:
    - Download the release bundle.
    - Verify the signature: `cosign verify-blob ...`
    - Ensure the SBOM meets policy.

2.  **Database Migration (Pre-Deploy)**:
    - Backup existing database: `scripts/backup.sh`
    - Run migration dry-run: `npm run migrate:dry-run`
    - Apply migrations: `npm run migrate:up`

3.  **Application Deploy**:
    - Update Helm chart values with new image tags.
    - `helm upgrade --install summit ./helm/summit -f values.prod.yaml`

4.  **Health Check**:
    - Monitor pod status: `kubectl get pods -w`
    - Verify endpoints: `curl https://api.summit.example.com/health`

## Post-Deploy Verification

- Check error rates in Grafana.
- Run smoke tests: `npm run smoke:prod`
