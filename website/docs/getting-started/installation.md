---
sidebar_position: 2
---

# Installation Guide

This guide covers different installation methods for Summit Platform.

## Installation Options

Choose the installation method that best fits your needs:

| Method | Best For | Setup Time |
|--------|----------|------------|
| [Docker](#docker-installation) | Quick start, development | 5 minutes |
| [Local Development](#local-development) | Contributing, debugging | 15 minutes |
| [Kubernetes](#kubernetes-deployment) | Production, scaling | 30 minutes |
| [Cloud Providers](#cloud-deployment) | Managed deployment | 20 minutes |

## Docker Installation

The fastest way to get Summit running.

### Prerequisites

- Docker Desktop ≥ 4.0
- 8GB+ RAM recommended
- 10GB free disk space

### Quick Start

```bash
git clone https://github.com/BrianCLong/summit.git
cd summit
./start.sh
```

### Manual Docker Setup

```bash
# 1. Clone repository
git clone https://github.com/BrianCLong/summit.git
cd summit

# 2. Copy environment file
cp .env.example .env

# 3. Start services
docker-compose -f docker-compose.dev.yml up -d

# 4. Wait for services to be ready
./scripts/wait-for-stack.sh

# 5. Run smoke tests
make smoke
```

### Docker Compose Profiles

```bash
# Core services only (minimal)
make up

# With AI capabilities
make up-ai

# With Kafka streaming
make up-kafka

# Full stack (AI + Kafka)
make up-full
```

## Local Development

For development and debugging without Docker.

### Prerequisites

- Node.js ≥ 18.18
- pnpm ≥ 9.12.0
- Python ≥ 3.11
- Neo4j ≥ 5.24
- PostgreSQL ≥ 16
- Redis ≥ 7

### Step-by-Step Setup

#### 1. Install System Dependencies

**macOS:**
```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install node@18 python@3.11 neo4j postgresql@16 redis
brew services start neo4j
brew services start postgresql@16
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
# Update packages
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install other dependencies
sudo apt install -y python3.11 python3.11-venv redis-server

# Install PostgreSQL
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-16

# Install Neo4j
wget -O - https://debian.neo4j.com/neotechnology.gpg.key | sudo apt-key add -
echo 'deb https://debian.neo4j.com stable latest' | sudo tee /etc/apt/sources.list.d/neo4j.list
sudo apt update
sudo apt install -y neo4j
```

#### 2. Enable pnpm

```bash
corepack enable
pnpm --version  # Should show 9.12.0+
```

#### 3. Clone and Setup

```bash
# Clone repository
git clone https://github.com/BrianCLong/summit.git
cd summit

# Run bootstrap
make bootstrap

# This will:
# - Install pnpm dependencies
# - Create Python virtual environment
# - Copy .env.example to .env
# - Set up pre-commit hooks
```

#### 4. Configure Databases

**PostgreSQL:**
```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE summit_dev;
CREATE USER summit WITH PASSWORD 'devpassword';
GRANT ALL PRIVILEGES ON DATABASE summit_dev TO summit;
\q
EOF
```

**Neo4j:**
```bash
# Set initial password
neo4j-admin set-initial-password devpassword

# Start Neo4j
neo4j start
```

**Redis:**
```bash
# Redis should already be running
redis-cli ping  # Should return PONG
```

#### 5. Configure Environment

Edit `.env` and update database URLs:

```bash
# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=devpassword

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=summit_dev
POSTGRES_USER=summit
POSTGRES_PASSWORD=devpassword

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### 6. Run Migrations

```bash
# Run database migrations
pnpm db:migrate

# Seed with demo data
pnpm db:seed
```

#### 7. Start Development Servers

```bash
# Terminal 1: Start server
pnpm server:dev

# Terminal 2: Start client
pnpm client:dev
```

Access:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000/graphql

## Kubernetes Deployment

For production deployments.

### Prerequisites

- Kubernetes cluster (≥ 1.24)
- kubectl configured
- Helm ≥ 3.0

### Install with Helm

```bash
# Add Helm repo (if you have one)
helm repo add summit https://charts.summit.io
helm repo update

# Or use local charts
cd summit

# Install
helm upgrade --install summit ./helm/summit \
  --namespace summit \
  --create-namespace \
  --values helm/summit/values/prod.yaml

# Check status
kubectl get pods -n summit
```

### Manual Kubernetes Setup

```bash
# Create namespace
kubectl create namespace summit

# Create secrets
kubectl create secret generic summit-secrets \
  --namespace summit \
  --from-literal=jwt-secret=$(openssl rand -base64 32) \
  --from-literal=jwt-refresh-secret=$(openssl rand -base64 32) \
  --from-literal=neo4j-password=$(openssl rand -base64 16) \
  --from-literal=postgres-password=$(openssl rand -base64 16)

# Apply manifests
kubectl apply -f deploy/kubernetes/ --namespace summit

# Check deployment
kubectl get all -n summit
```

## Cloud Deployment

### AWS

**Using ECS:**
```bash
# Build and push images
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

docker build -t summit-server ./server
docker tag summit-server:latest <account>.dkr.ecr.us-east-1.amazonaws.com/summit-server:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/summit-server:latest

# Deploy using CloudFormation or Terraform
terraform apply -var-file=prod.tfvars
```

**Using EKS:**
```bash
# Create EKS cluster
eksctl create cluster --name summit --region us-east-1

# Install with Helm
helm upgrade --install summit ./helm/summit \
  --namespace summit \
  --create-namespace
```

### Google Cloud Platform

```bash
# Create GKE cluster
gcloud container clusters create summit \
  --zone us-central1-a \
  --num-nodes 3

# Get credentials
gcloud container clusters get-credentials summit

# Deploy with Helm
helm upgrade --install summit ./helm/summit \
  --namespace summit \
  --create-namespace
```

### Azure

```bash
# Create AKS cluster
az aks create \
  --resource-group summit-rg \
  --name summit \
  --node-count 3 \
  --enable-managed-identity

# Get credentials
az aks get-credentials --resource-group summit-rg --name summit

# Deploy
helm upgrade --install summit ./helm/summit \
  --namespace summit \
  --create-namespace
```

## Verify Installation

### Health Checks

```bash
# Basic health
curl http://localhost:4000/health

# Detailed status
curl http://localhost:4000/health/detailed | jq

# Metrics
curl http://localhost:4000/metrics | head -20
```

### Run Tests

```bash
# Smoke tests (validates golden path)
make smoke

# Full test suite
pnpm test

# E2E tests
pnpm test:e2e
```

## Troubleshooting

### Docker Issues

**Services won't start:**
```bash
# Check Docker memory
docker info | grep Memory

# Increase Docker memory to 8GB+ in Docker Desktop settings

# Clean up
docker system prune -a
```

**Port conflicts:**
```bash
# Find process using port
lsof -i :4000

# Kill process
kill -9 <PID>
```

### Database Issues

**PostgreSQL connection error:**
```bash
# Check PostgreSQL is running
pg_isready

# Reset password
sudo -u postgres psql -c "ALTER USER summit PASSWORD 'devpassword';"
```

**Neo4j connection error:**
```bash
# Check Neo4j status
neo4j status

# Restart Neo4j
neo4j restart

# Check logs
tail -f /var/log/neo4j/neo4j.log
```

### Build Issues

**pnpm install fails:**
```bash
# Clear cache
pnpm store prune

# Delete node_modules
rm -rf node_modules
find . -name 'node_modules' -type d -prune -exec rm -rf '{}' +

# Reinstall
pnpm install --frozen-lockfile
```

**TypeScript errors:**
```bash
# Clear TypeScript cache
pnpm run typecheck --force

# Rebuild
pnpm run build --force
```

## Next Steps

- ⚙️ [Configuration Guide](/docs/getting-started/configuration)
- 📊 [First Data Import](/docs/getting-started/first-import)
- 🔌 [API Documentation](/docs/api/overview)
- 🏗️ [Architecture Overview](/docs/architecture/overview)

## Need Help?

- 🐛 [Report an issue](https://github.com/BrianCLong/summit/issues)
- 💬 [Ask questions](https://github.com/BrianCLong/summit/discussions)
- 📧 Email: support@summit.com
