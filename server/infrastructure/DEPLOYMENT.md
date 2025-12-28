# Summit v4.0 - Cloud Deployment Guide

This guide walks through deploying Summit v4.0 to AWS using Kubernetes (EKS) and Terraform.

## Architecture Overview

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                         AWS Cloud                           │
                                    │                                                             │
┌──────────┐                        │  ┌─────────────┐     ┌──────────────────────────────────┐  │
│  Users   │──────HTTPS────────────▶│  │    ALB      │────▶│          EKS Cluster             │  │
└──────────┘                        │  │  (Ingress)  │     │                                  │  │
                                    │  └─────────────┘     │  ┌────────────────────────────┐  │  │
                                    │         │            │  │     Summit API Pods (3-20) │  │  │
                                    │         │            │  │     - API Server           │  │  │
                                    │  ┌──────▼──────┐     │  │     - AI Governance        │  │  │
                                    │  │  Route 53   │     │  │     - Compliance Engine    │  │  │
                                    │  │  (DNS)      │     │  └────────────────────────────┘  │  │
                                    │  └─────────────┘     │              │                    │  │
                                    │                      │              ▼                    │  │
                                    │  ┌──────────────────────────────────────────────────┐   │  │
                                    │  │                 Data Layer                        │   │  │
                                    │  │  ┌──────────────┐        ┌──────────────────┐    │   │  │
                                    │  │  │  RDS         │        │   ElastiCache    │    │   │  │
                                    │  │  │  PostgreSQL  │        │   Redis          │    │   │  │
                                    │  │  │  (Multi-AZ)  │        │   (Cluster Mode) │    │   │  │
                                    │  │  └──────────────┘        └──────────────────┘    │   │  │
                                    │  └──────────────────────────────────────────────────┘   │  │
                                    │                                                         │  │
                                    │  ┌──────────────────────────────────────────────────┐   │  │
                                    │  │              Security & Compliance                │   │  │
                                    │  │  ┌──────────────┐        ┌──────────────────┐    │   │  │
                                    │  │  │  CloudHSM    │        │   Secrets        │    │   │  │
                                    │  │  │  (Optional)  │        │   Manager        │    │   │  │
                                    │  │  └──────────────┘        └──────────────────┘    │   │  │
                                    │  └──────────────────────────────────────────────────┘   │  │
                                    └─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- AWS CLI v2 configured with appropriate credentials
- Terraform >= 1.6.0
- kubectl >= 1.28
- Helm >= 3.13
- Docker (for building images)
- pnpm >= 8.0

## Quick Start

### 1. Set Up Terraform Backend

```bash
# One-time setup for Terraform state management
./infrastructure/scripts/setup-terraform-backend.sh
```

### 2. Deploy Everything

```bash
# Full deployment (infrastructure + application)
./infrastructure/scripts/deploy-production.sh deploy
```

### 3. Verify Deployment

```bash
# Check deployment health
./infrastructure/scripts/deploy-production.sh verify
```

## Step-by-Step Deployment

### Step 1: Configure AWS Credentials

```bash
# Set up AWS credentials
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-west-2"

# Verify credentials
aws sts get-caller-identity
```

### Step 2: Create Terraform Backend

```bash
cd infrastructure/scripts
./setup-terraform-backend.sh
cd ../..
```

### Step 3: Deploy Infrastructure

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init \
  -backend-config="bucket=summit-terraform-state" \
  -backend-config="key=production/terraform.tfstate" \
  -backend-config="region=us-west-2"

# Plan deployment
terraform plan -var="environment=production" -out=tfplan

# Apply infrastructure
terraform apply tfplan

cd ../..
```

### Step 4: Configure kubectl

```bash
# Update kubeconfig for EKS
aws eks update-kubeconfig --region us-west-2 --name summit-production

# Verify connection
kubectl cluster-info
```

### Step 5: Install Cluster Prerequisites

```bash
# NGINX Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# cert-manager for TLS
helm repo add jetstack https://charts.jetstack.io
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true

# external-secrets-operator for AWS Secrets Manager
helm repo add external-secrets https://charts.external-secrets.io
helm upgrade --install external-secrets external-secrets/external-secrets \
  --namespace external-secrets --create-namespace

# Prometheus Stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace
```

### Step 6: Build and Push Docker Image

```bash
# Login to ECR
aws ecr get-login-password --region us-west-2 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-west-2.amazonaws.com

# Build image
docker build -t summit/server:v4.0.0 \
  --build-arg VERSION=4.0.0 \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg GIT_SHA=$(git rev-parse HEAD) \
  .

# Tag and push
docker tag summit/server:v4.0.0 \
  <account-id>.dkr.ecr.us-west-2.amazonaws.com/summit/server:v4.0.0
docker push <account-id>.dkr.ecr.us-west-2.amazonaws.com/summit/server:v4.0.0
```

### Step 7: Deploy Application

```bash
# Apply Kubernetes manifests
kubectl apply -f infrastructure/kubernetes/base/namespace.yaml
kubectl apply -f infrastructure/kubernetes/base/configmap.yaml
kubectl apply -f infrastructure/kubernetes/base/secrets.yaml
kubectl apply -f infrastructure/kubernetes/base/database.yaml
kubectl apply -f infrastructure/kubernetes/base/api-deployment.yaml
kubectl apply -f infrastructure/kubernetes/base/ingress.yaml

# Verify deployment
kubectl rollout status deployment/summit-api -n summit
```

### Step 8: Verify Deployment

```bash
# Check pods
kubectl get pods -n summit

# Check services
kubectl get svc -n summit

# Check ingress
kubectl get ingress -n summit

# Test health endpoint
curl https://api.summit.io/health/ready
```

## Environment Variables

The following environment variables are required for deployment:

| Variable           | Description            | Example             |
| ------------------ | ---------------------- | ------------------- |
| `AWS_REGION`       | AWS region             | `us-west-2`         |
| `EKS_CLUSTER_NAME` | EKS cluster name       | `summit-production` |
| `VERSION`          | Version to deploy      | `v4.0.0`            |
| `ROUTE53_ZONE_ID`  | Route53 hosted zone ID | `Z1234567890`       |

## Secrets Management

Secrets are managed through AWS Secrets Manager and synced to Kubernetes using external-secrets-operator.

Required secrets in AWS Secrets Manager:

```
summit/production/database
  - username
  - password
  - host

summit/production/redis
  - auth_token
  - endpoint

summit/production/jwt
  - secret
  - refresh_secret

summit/production/ai-providers
  - openai_key
  - anthropic_key

summit/production/encryption
  - key
  - audit_signing_key
```

## Monitoring

### Grafana Dashboards

Access Grafana at: `https://monitoring.summit.io`

Pre-configured dashboards:

- Summit API Overview
- v4 Feature Adoption
- AI Governance Metrics
- Compliance Dashboard
- Database Performance

### Prometheus Metrics

Key metrics to monitor:

- `summit_api_requests_total`
- `summit_v4_feature_adoption`
- `summit_ai_suggestions_total`
- `summit_compliance_assessments_total`
- `summit_audit_entries_total`

### Alerting

Alerts are configured in Prometheus for:

- High error rates (>1%)
- High latency (>500ms p99)
- Low availability (<99.9%)
- Database connection issues
- Redis connection issues

## Rollback

To rollback to the previous version:

```bash
# Using the deployment script
./infrastructure/scripts/deploy-production.sh rollback

# Or manually with kubectl
kubectl rollout undo deployment/summit-api -n summit
```

## Troubleshooting

### Common Issues

**Pods not starting:**

```bash
kubectl describe pod <pod-name> -n summit
kubectl logs <pod-name> -n summit
```

**Database connection issues:**

```bash
# Check RDS security groups
aws rds describe-db-instances --db-instance-identifier summit-production

# Check secrets
kubectl get secret summit-secrets -n summit -o yaml
```

**Ingress not working:**

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -l app.kubernetes.io/name=ingress-nginx -n ingress-nginx

# Check certificate
kubectl describe certificate summit-api-tls -n summit
```

### Support

For deployment issues, contact:

- Platform Team: platform@summit.io
- On-call: #summit-oncall (Slack)

## Cost Estimates

Monthly cost estimates for production environment:

| Resource          | Configuration          | Est. Cost/Month      |
| ----------------- | ---------------------- | -------------------- |
| EKS Cluster       | 1 cluster              | $73                  |
| EC2 (EKS Nodes)   | 5x m6i.xlarge          | $720                 |
| RDS PostgreSQL    | db.r6g.xlarge Multi-AZ | $580                 |
| ElastiCache Redis | 3x cache.r6g.large     | $390                 |
| ALB               | 1 ALB                  | $25                  |
| CloudHSM          | 1 HSM (optional)       | $1,500               |
| Data Transfer     | ~100GB/month           | $9                   |
| **Total**         |                        | **~$1,800 - $3,300** |

_Costs vary by usage. CloudHSM is optional but recommended for compliance._
