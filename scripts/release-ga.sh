#!/usr/bin/env bash
set -euo pipefail

# Summit GA Release Script
# Purpose: Tag, build, and package the Org Mesh Twin v1 release.

echo "🚀 Starting GA Release process for Org Mesh Twin v1..."

# 1. Tagging
echo "🏷️  Tagging release v1.0.0-org-mesh-twin..."
git tag -a v1.0.0-org-mesh-twin -m "GA Release: Org Mesh Twin v1"

# 2. Build
echo "🏗️  Building project..."
# Using pnpm as it is the preferred package manager
pnpm run build

# 3. Docker Build
echo "🐳 Building Docker image summit:ga..."
docker build -t summit:ga .

# 4. Kubernetes Manifests & Helm
echo "☸️  Generating deployment artifacts..."
mkdir -p k8s/deployments
cat > k8s/deployments/ga-release.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: summit-ga
  labels:
    app: summit
    version: ga
spec:
  replicas: 3
  selector:
    matchLabels:
      app: summit
  template:
    metadata:
      labels:
        app: summit
    spec:
      containers:
      - name: summit
        image: summit:ga
        ports:
        - containerPort: 3000
EOF

mkdir -p helm/summit
cat > helm/summit/ga-values.yaml << EOF
# GA Release Values
replicaCount: 3
image:
  repository: summit
  tag: ga
  pullPolicy: IfNotPresent
service:
  type: ClusterIP
  port: 80
EOF

echo "✅ GA Release packaging complete!"

echo "💡 To push the tag to origin, run: git push origin v1.0.0-org-mesh-twin"
