#!/bin/bash
set -e

TAG=${1:-latest}
REPO_PREFIX=${REPO_PREFIX:-summit}

echo "Building API image..."
docker build -t ${REPO_PREFIX}/api:${TAG} -f deploy/docker/Dockerfile.api .

echo "Building Client image..."
docker build -t ${REPO_PREFIX}/client:${TAG} -f deploy/docker/Dockerfile.web .

echo "Images built:"
docker images | grep ${REPO_PREFIX}
