# Air-Gapped Deployment Guide

This guide describes the procedure for deploying Summit in air-gapped environments (no internet access).

## Prerequisites

- **Bastion Host**: A machine with internet access to fetch artifacts.
- **Air-Gapped Registry**: A private container registry (e.g., Harbor, Artifactory) reachable from the target cluster.
- **Air-Gapped Cluster**: Kubernetes cluster with access to the private registry.

## 1. Artifact Collection (Bastion Host)

### 1.1 Pull Container Images

You must pull all required images and save them to a tarball or push them to an intermediate registry.

```bash
# List of required images
IMAGES=(
  "ghcr.io/brianclong/summit:prod"
  "postgres:15-alpine"
  "neo4j:5.12.0"
  "redis:7.2-alpine"
)

for img in "${IMAGES[@]}"; do
  docker pull "$img"
  # Retag for private registry
  docker tag "$img" "private-registry.example.com/summit/${img##*/}"
done
```

### 1.2 Package Helm Charts

Package the Summit chart and its dependencies.

```bash
helm package helm/summit/
# Result: summit-1.0.0.tgz
```

## 2. Artifact Transfer

Transfer the Docker images and Helm chart tarball to the air-gapped environment (e.g., via secure USB, data diode).

## 3. Deployment (Air-Gapped Environment)

### 3.1 Load Images

Push the images to your internal registry.

```bash
# Assuming images are loaded into local docker daemon
for img in "${IMAGES[@]}"; do
  docker push "private-registry.example.com/summit/${img##*/}"
done
```

### 3.2 Configure Helm

Create a `values.airgap.yaml` file overriding the image repositories.

```yaml
image:
  repository: private-registry.example.com/summit/summit
  tag: prod

# If using external databases (recommended for airgap)
externalDatabase:
  host: "postgres-internal.example.com"
  # ...
```

### 3.3 Install

```bash
helm install summit ./summit-1.0.0.tgz -f values.airgap.yaml -n summit --create-namespace
```

## Troubleshooting

- **ImagePullBackOff**: Check if the private registry secrets are configured in the namespace.
- **CrashLoopBackOff**: Verify that the application can reach the internal database endpoints.
