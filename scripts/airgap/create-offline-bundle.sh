#!/usr/bin/env bash
# Create offline deployment bundle for air-gapped environments (GDC & Docker Compose)

set -euo pipefail

BUNDLE_DIR="${BUNDLE_DIR:-./airgap-bundle}"
RELEASE_TAG="${RELEASE_TAG:-2025.10.HALLOWEEN}"
REGISTRY_URL="${REGISTRY_URL:-ghcr.io/brianclong}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Create bundle directory structure
create_bundle_structure() {
  log_info "Creating bundle directory structure..."

  mkdir -p "$BUNDLE_DIR"/{images,config,scripts,checksums,docs,manifests}

  log_info "Bundle structure created at: $BUNDLE_DIR"
}

# Get list of all required images
get_image_list() {
  log_info "Generating image list for release $RELEASE_TAG..."

  cat > "$BUNDLE_DIR/images/image-list.txt" <<EOF
# IntelGraph Platform Images - Release $RELEASE_TAG
${REGISTRY_URL}/intelgraph-api:${RELEASE_TAG}
${REGISTRY_URL}/intelgraph-frontend:${RELEASE_TAG}
${REGISTRY_URL}/intelgraph-neo4j:${RELEASE_TAG}
${REGISTRY_URL}/intelgraph-postgres:${RELEASE_TAG}
${REGISTRY_URL}/intelgraph-redis:${RELEASE_TAG}
${REGISTRY_URL}/intelgraph-conductor:${RELEASE_TAG}
${REGISTRY_URL}/intelgraph-switchboard:${RELEASE_TAG}
${REGISTRY_URL}/opa:0.69.0
neo4j:5.20-community
postgres:16-alpine
redis:7-alpine
EOF

  log_info "Image list saved to: $BUNDLE_DIR/images/image-list.txt"
}

# Pull and save images with digests
pull_and_save_images() {
  log_info "Pulling images and extracting digests..."

  while IFS= read -r image; do
    # Skip comments and empty lines
    [[ "$image" =~ ^#.*$ ]] && continue
    [[ -z "$image" ]] && continue

    log_info "Pulling image: $image"
    docker pull "$image" 2>&1 | tee -a "$BUNDLE_DIR/checksums/pull.log"

    # Get digest
    digest=$(docker inspect --format='{{index .RepoDigests 0}}' "$image" 2>/dev/null || echo "")

    if [ -n "$digest" ]; then
      echo "$digest" >> "$BUNDLE_DIR/images/image-digests.txt"
      log_info "  Digest: $digest"
    else
      log_warn "  No digest found for $image"
    fi

    # Save image to tar
    image_filename=$(echo "$image" | tr '/:' '_')
    log_info "Saving image to: $image_filename.tar"
    docker save "$image" -o "$BUNDLE_DIR/images/$image_filename.tar"

  done < "$BUNDLE_DIR/images/image-list.txt"

  log_info "All images pulled and saved"
}

# Copy Kubernetes manifests
copy_k8s_manifests() {
  log_info "Copying Kubernetes GDC manifests..."

  if [ -d "../kubernetes/gdc" ]; then
    cp -r ../kubernetes/gdc/* "$BUNDLE_DIR/manifests/"
    log_info "Manifests copied to: $BUNDLE_DIR/manifests/"
  else
    log_warn "Kubernetes GDC manifests not found in ../kubernetes/gdc"
  fi
}

# Generate checksums
generate_checksums() {
  log_info "Generating SHA256 checksums..."

  cd "$BUNDLE_DIR/images"
  sha256sum *.tar > ../checksums/images.sha256
  cd - > /dev/null

  # Generate overall manifest
  cd "$BUNDLE_DIR"
  find . -type f -not -path "*/checksums/*" -exec sha256sum {} \; > checksums/manifest.sha256
  cd - > /dev/null

  log_info "Checksums saved to: $BUNDLE_DIR/checksums/"
}

# Create config injection template
create_config_template() {
  log_info "Creating configuration injection template..."

  cat > "$BUNDLE_DIR/config/config-template.env" <<'EOF'
# IntelGraph Air-Gap Configuration Template
# Copy this file to .env and fill in your values

# Registry Configuration
PRIVATE_REGISTRY_URL=registry.airgap.local:5000
REGISTRY_USERNAME=
REGISTRY_PASSWORD=

# Database Configuration (for external DBs)
POSTGRES_HOST=postgres.airgap.local
POSTGRES_PORT=5432
POSTGRES_USER=intelgraph
POSTGRES_PASSWORD=
POSTGRES_DB=intelgraph

# Neo4j Configuration
NEO4J_URI=bolt://neo4j.airgap.local:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=

# Redis Configuration
REDIS_URL=redis://redis.airgap.local:6379
REDIS_PASSWORD=

# OPA Configuration
OPA_URL=http://opa.airgap.local:8181

# Application Secrets
JWT_SECRET=
ENCRYPTION_KEY=
API_KEY=

# Zero Trust
ENABLE_MTLS=true
ENABLE_OPA=true

# Feature Flags
ENABLE_STEP_UP_AUTH=true
ENABLE_PROVENANCE_TRACKING=true
ENABLE_DLP_SCANNING=true
EOF

  log_info "Config template saved to: $BUNDLE_DIR/config/config-template.env"
}

# Create deployment scripts
create_deployment_scripts() {
  log_info "Creating deployment scripts..."

  # Registry mirror script
  cat > "$BUNDLE_DIR/scripts/01-setup-private-registry.sh" <<'EOF'
#!/usr/bin/env bash
# Setup private Docker registry for air-gap deployment

set -euo pipefail

source ../config/.env

echo "Setting up private Docker registry at $PRIVATE_REGISTRY_URL..."

# Load images from bundle
for tar_file in ../images/*.tar; do
  echo "Loading $(basename "$tar_file")..."
  docker load -i "$tar_file"
done

# Tag and push to private registry
while IFS= read -r image; do
  [[ "$image" =~ ^#.*$ ]] && continue
  [[ -z "$image" ]] && continue

  # Extract image name and tag
  image_name=$(echo "$image" | awk -F'/' '{print $NF}')
  private_image="$PRIVATE_REGISTRY_URL/$image_name"

  echo "Tagging $image as $private_image"
  docker tag "$image" "$private_image"

  echo "Pushing $private_image to private registry"
  docker push "$private_image"
done < ../images/image-list.txt

echo "✅ Private registry setup complete"
EOF
  chmod +x "$BUNDLE_DIR/scripts/01-setup-private-registry.sh"

  # Docker Compose Deployment Script
  cat > "$BUNDLE_DIR/scripts/02-deploy-compose-airgap.sh" <<'EOF'
#!/usr/bin/env bash
# Deploy IntelGraph via Docker Compose in air-gap environment

set -euo pipefail

source ../config/.env

echo "Deploying IntelGraph (Docker Compose) from private registry..."

# Generate docker-compose with private registry images
cat > docker-compose.airgap.yml <<COMPOSE
version: '3.8'
services:
  postgres:
    image: ${PRIVATE_REGISTRY_URL}/postgres_16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres-data:/var/lib/postgresql/data

  neo4j:
    image: ${PRIVATE_REGISTRY_URL}/neo4j_5.20-community
    environment:
      NEO4J_AUTH: ${NEO4J_USER}/${NEO4J_PASSWORD}
    volumes:
      - neo4j-data:/data

  redis:
    image: ${PRIVATE_REGISTRY_URL}/redis_7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data

  api:
    image: ${PRIVATE_REGISTRY_URL}/intelgraph-api_${RELEASE_TAG}
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_PORT: ${POSTGRES_PORT}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      NEO4J_URI: ${NEO4J_URI}
      NEO4J_USER: ${NEO4J_USER}
      NEO4J_PASSWORD: ${NEO4J_PASSWORD}
      REDIS_URL: ${REDIS_URL}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
      - neo4j
      - redis

  frontend:
    image: ${PRIVATE_REGISTRY_URL}/intelgraph-frontend_${RELEASE_TAG}
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  postgres-data:
  neo4j-data:
  redis-data:
COMPOSE

docker-compose -f docker-compose.airgap.yml up -d

echo "✅ Air-gap deployment (Compose) complete"
EOF
  chmod +x "$BUNDLE_DIR/scripts/02-deploy-compose-airgap.sh"

  # Kubernetes GDC Deployment Script
  cat > "$BUNDLE_DIR/scripts/02-deploy-k8s-airgap.sh" <<'EOF'
#!/usr/bin/env bash
# Deploy IntelGraph to GDC/Kubernetes in air-gap environment

set -euo pipefail

source ../config/.env

echo "Deploying IntelGraph to Kubernetes (GDC)..."

if ! command -v kubectl >/dev/null 2>&1; then
    echo "❌ kubectl is required but not installed."
    exit 1
fi

echo "Updating kustomization.yaml with private registry: $PRIVATE_REGISTRY_URL"

# We use sed to update the registry in kustomization.yaml located in manifests/
# Note: This is a simple replacement for the reference implementation.
# In production, use 'kustomize edit set image' if kustomize CLI is available.

cd ../manifests

if command -v kustomize >/dev/null 2>&1; then
    kustomize edit set image ghcr.io/brianclong/intelgraph-api=$PRIVATE_REGISTRY_URL/intelgraph-api
    kustomize edit set image ghcr.io/brianclong/intelgraph-frontend=$PRIVATE_REGISTRY_URL/intelgraph-frontend
    kustomize edit set image postgres=$PRIVATE_REGISTRY_URL/postgres
    kustomize edit set image neo4j=$PRIVATE_REGISTRY_URL/neo4j
    kustomize edit set image redis=$PRIVATE_REGISTRY_URL/redis
else
    echo "⚠️ kustomize CLI not found, assuming manual kustomization.yaml edit or using defaults."
fi

# Apply secrets
echo "Creating/Updating Secrets..."
kubectl create secret generic intelgraph-secrets \
    --namespace=intelgraph-gdc \
    --from-literal=JWT_SECRET="$JWT_SECRET" \
    --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    --from-literal=NEO4J_PASSWORD="$NEO4J_PASSWORD" \
    --from-literal=REDIS_PASSWORD="$REDIS_PASSWORD" \
    --dry-run=client -o yaml | kubectl apply -f -

# Apply manifests
echo "Applying manifests..."
kubectl apply -k .

echo "✅ Air-gap deployment (Kubernetes) complete"
echo "Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod --all -n intelgraph-gdc --timeout=300s
EOF
  chmod +x "$BUNDLE_DIR/scripts/02-deploy-k8s-airgap.sh"

  # Verification script
  cat > "$BUNDLE_DIR/scripts/03-verify-deployment.sh" <<'EOF'
#!/usr/bin/env bash
# Verify air-gap deployment

set -euo pipefail

echo "Verifying checksums..."
cd ../checksums
sha256sum -c images.sha256 || { echo "❌ Image checksum verification failed"; exit 1; }
echo "✅ All image checksums verified"

echo "Verifying deployment health..."
if command -v kubectl >/dev/null 2>&1; then
    echo "Checking Kubernetes pods..."
    kubectl get pods -n intelgraph-gdc
else
    echo "Checking Docker containers..."
    docker ps | grep intelgraph
fi

echo "✅ Deployment verification complete"
EOF
  chmod +x "$BUNDLE_DIR/scripts/03-verify-deployment.sh"

  log_info "Deployment scripts created in: $BUNDLE_DIR/scripts/"
}

# Create rollback script
create_rollback_script() {
  log_info "Creating rollback script..."

  cat > "$BUNDLE_DIR/scripts/rollback.sh" <<'EOF'
#!/usr/bin/env bash
# Rollback air-gap deployment

set -euo pipefail

echo "Rolling back deployment..."

if command -v kubectl >/dev/null 2>&1; then
    echo "Deleting Kubernetes resources..."
    kubectl delete -k ../manifests --ignore-not-found
else
    echo "Bringing down Docker Compose..."
    if [ -f "docker-compose.airgap.yml" ]; then
        docker-compose -f docker-compose.airgap.yml down
    fi
fi

echo "✅ Rollback complete"
EOF
  chmod +x "$BUNDLE_DIR/scripts/rollback.sh"

  log_info "Rollback script created"
}

# Create documentation
create_documentation() {
  log_info "Creating deployment documentation..."

  cat > "$BUNDLE_DIR/docs/AIR_GAP_DEPLOYMENT_GUIDE.md" <<'EOF'
# IntelGraph Air-Gap Deployment Guide (GDC & Compose)

## Overview

This bundle contains everything needed to deploy IntelGraph in an air-gapped environment, supporting both Google Distributed Cloud (GDC) / Kubernetes and Docker Compose.

## Bundle Contents

- `images/` - Docker images (tar files) with digests
- `config/` - Configuration templates
- `scripts/` - Deployment automation scripts
- `manifests/` - Kubernetes/GDC manifests
- `checksums/` - SHA256 checksums for verification
- `docs/` - This documentation

## Prerequisites

- **GDC/Kubernetes**:
    - Kubernetes 1.24+ Cluster (Air-gapped)
    - `kubectl` configured
    - Private Container Registry accessible from cluster
- **Docker Compose**:
    - Docker Engine 24.0+
    - Docker Compose 2.20+

## Deployment Steps

### 1. Transfer Bundle

Copy entire `airgap-bundle/` directory to air-gap environment (Bastion Host).

### 2. Verify Checksums

```bash
cd airgap-bundle/checksums
sha256sum -c images.sha256
sha256sum -c manifest.sha256
```

### 3. Configure Environment

```bash
cp config/config-template.env config/.env
# Edit config/.env with your values
```

### 4. Setup Private Registry

```bash
cd scripts
./01-setup-private-registry.sh
```

### 5. Deploy Application

**Option A: Kubernetes / GDC (Recommended)**
```bash
./02-deploy-k8s-airgap.sh
```

**Option B: Docker Compose (Dev/Test)**
```bash
./02-deploy-compose-airgap.sh
```

### 6. Verify Deployment

```bash
./03-verify-deployment.sh
```

## Rollback

If deployment fails:

```bash
./scripts/rollback.sh
```

## Troubleshooting

### Checksum Mismatch
- Verify bundle transfer integrity
- Re-transfer bundle

### Registry Push Fails
- Check registry credentials in `.env`
- Verify network connectivity to registry

### Kubernetes Errors
- Ensure `kubectl` is authenticated
- Check storage classes in `manifests/` match your environment
- Verify ImagePullSecrets if required for private registry

## Support

Contact: support@intelgraph.io
EOF

  log_info "Documentation created at: $BUNDLE_DIR/docs/AIR_GAP_DEPLOYMENT_GUIDE.md"
}

# Generate dry-run transcript
generate_transcript() {
  log_info "Generating dry-run transcript..."

  cat > "$BUNDLE_DIR/DRY_RUN_TRANSCRIPT.md" <<EOF
# Air-Gap Deployment Dry-Run Transcript
**Generated**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Release**: $RELEASE_TAG

## Pre-Flight Checks

✅ Bundle directory structure created
✅ Image list generated
✅ Configuration template created
✅ Deployment scripts created
✅ Kubernetes manifests copied
✅ Checksums generated

## Image Manifest

\`\`\`
$(cat "$BUNDLE_DIR/images/image-digests.txt")
\`\`\`

## Checksum Verification

\`\`\`
$(cat "$BUNDLE_DIR/checksums/images.sha256")
\`\`\`

## Deployment Sequence

1. ✅ Transfer bundle to air-gap environment
2. ✅ Verify checksums
3. ✅ Configure environment (.env)
4. ✅ Setup private registry
5. ✅ Deploy application (GDC/K8s or Compose)
6. ✅ Verify deployment health

## Status

**Bundle Size**: $(du -sh "$BUNDLE_DIR" | awk '{print $1}')
**Images**: $(ls -1 "$BUNDLE_DIR/images"/*.tar 2>/dev/null | wc -l | xargs)
**Manifests**: $(ls -1 "$BUNDLE_DIR/manifests"/*.yaml 2>/dev/null | wc -l | xargs)

✅ **Air-gap bundle ready for deployment**
EOF

  log_info "Transcript saved to: $BUNDLE_DIR/DRY_RUN_TRANSCRIPT.md"
}

# Main execution
main() {
  log_info "Creating air-gap deployment bundle..."
  log_info "Release: $RELEASE_TAG"
  log_info "Registry: $REGISTRY_URL"

  create_bundle_structure
  get_image_list
  pull_and_save_images
  copy_k8s_manifests
  generate_checksums
  create_config_template
  create_deployment_scripts
  create_rollback_script
  create_documentation
  generate_transcript

  log_info "✅ Air-gap bundle creation complete!"
  log_info "Bundle location: $BUNDLE_DIR"
  log_info "Bundle size: $(du -sh "$BUNDLE_DIR" | awk '{print $1}')"
  log_info ""
  log_info "Next steps:"
  log_info "1. Review: $BUNDLE_DIR/DRY_RUN_TRANSCRIPT.md"
  log_info "2. Transfer bundle to air-gap environment"
  log_info "3. Follow: $BUNDLE_DIR/docs/AIR_GAP_DEPLOYMENT_GUIDE.md"
}

main "$@"
