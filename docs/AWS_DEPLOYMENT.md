# AWS Production Deployment Guide (Summit Platform)

This guide details the procedure for deploying the Summit Platform (Maestro, IntelGraph, Policy-LAC) to AWS EKS using the unified "Cattle" architecture.

## 1. Prerequisites

*   **AWS CLI** configured with `AdministratorAccess` (or sufficient power to create EKS/VPC/RDS).
*   **Terraform** (v1.5+).
*   **Kubectl** (v1.29+).
*   **Helm** (v3+).
*   **GitHub Actions Secrets** configured:
    *   `AWS_ACCOUNT_ID`: Your 12-digit AWS account ID.

## 2. Infrastructure Provisioning (One-Time Setup)

The infrastructure is defined in `terraform/environments/prod`.

```bash
cd terraform/environments/prod

# 1. Initialize Terraform
terraform init

# 2. Review Plan
terraform plan -out=tfplan

# 3. Apply (This takes ~15-20 mins)
terraform apply tfplan
```

### Outputs to Note
After `apply`, Terraform will output:
*   `cluster_endpoint`: The API URL of the EKS cluster.
*   `database_endpoint`: The connection string for Aurora PostgreSQL.

# 3. Cluster Bootstrap (Day 1 Operations)

After the EKS cluster is created, you must install the core controllers (Ingress, Cert-Manager, Metrics).

```bash
# Verify you are connected to the correct cluster
kubectl config current-context

# Run the bootstrap script
./scripts/cluster-bootstrap.sh
```

## 4. Database Secrets

Before deploying applications, you must seed the database credentials into AWS Secrets Manager or Kubernetes Secrets.

**Helper Script:**
```bash
# Set your DB password
export DB_PASSWORD="your-strong-password"

# Run the helper (creates K8s secrets)
./scripts/aws-init-secrets.sh
```

## 4. Application Deployment

Applications are deployed automatically via GitHub Actions on push to `main` (Dev) or Release Tags (Prod).

### Manual Deployment (Emergency)
If CI/CD is down, you can deploy using Helm locally:

```bash
# Login to ECR
aws ecr get-login-password | helm registry login ...

# Deploy Maestro
helm upgrade --install maestro charts/universal-app \
  --namespace default \
  --set image.tag=latest \
  --values charts/universal-app/values.yaml
```

## 5. Neo4j Graph Database

Neo4j runs as a StatefulSet on dedicated `r6i` memory-optimized nodes.

```bash
# Verify Neo4j is running on the correct nodes
kubectl get pods -l app.kubernetes.io/name=neo4j -o wide
```

## 6. Troubleshooting

*   **Pods Pending?** Check if the autoscaler has spun up enough nodes: `kubectl get nodes`.
*   **Database Connection Errors?** Verify the `db-credentials` secret exists: `kubectl get secret db-credentials`.
*   **Ingress 404?** Ensure the AWS Load Balancer Controller is installed (Terraform module handles this usually, or requires a separate helm install).

## 7. Disaster Recovery

*   **RDS:** Aurora has Point-in-Time Recovery enabled by default (7 days).
*   **Neo4j:** Regular snapshots should be configured to S3 (see `infra/dr/backup-neo4j.cronjob.yaml` if available, or configure via Helm values).

```