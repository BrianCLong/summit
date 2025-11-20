#!/bin/bash
set -e

NAMESPACE=${1:-summit-staging}
REPO_PREFIX=${REPO_PREFIX:-summit}
TAG=${TAG:-latest}

echo "Deploying to namespace: $NAMESPACE"

# Create namespace
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Deploy Dependencies
echo "Deploying Dependencies (Postgres, Redis, Neo4j, OPA)..."
kubectl apply -n $NAMESPACE -f deploy/k8s/postgres.yaml
kubectl apply -n $NAMESPACE -f deploy/k8s/redis.yaml
kubectl apply -n $NAMESPACE -f deploy/k8s/neo4j.yaml
kubectl apply -n $NAMESPACE -f deploy/k8s/opa.yaml

echo "Deploying API..."
helm upgrade --install intelgraph-api charts/intelgraph-api \
  -n $NAMESPACE \
  --set image.repository=$REPO_PREFIX/api \
  --set image.tag=$TAG \
  --set env.POSTGRES_HOST=postgres \
  --set env.POSTGRES_PASSWORD=devpassword \
  --set env.NEO4J_URI=bolt://neo4j:7687 \
  --set env.NEO4J_PASSWORD=testpassword \
  --set env.REDIS_HOST=redis \
  --set env.OPA_URL=http://opa:8181

echo "Deploying Client..."
helm upgrade --install companyos-console charts/companyos-console \
  -n $NAMESPACE \
  --set image.repository=$REPO_PREFIX/client \
  --set image.tag=$TAG \
  --set apiService.name=intelgraph-api \
  --set apiService.port=4000

echo "Deployment commands executed."
echo "Check status with: kubectl get pods -n $NAMESPACE"
