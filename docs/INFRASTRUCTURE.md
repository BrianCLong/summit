# Summit Infrastructure as Code Guide

> **Version**: 1.0.0
> **Last Updated**: 2025-11-20
> **Purpose**: Complete guide to Summit's infrastructure automation and IaC practices

## Table of Contents

1. [Overview](#overview)
2. [Infrastructure Components](#infrastructure-components)
3. [Terraform Configuration](#terraform-configuration)
4. [Kubernetes Resources](#kubernetes-resources)
5. [Container Registry](#container-registry)
6. [Networking](#networking)
7. [Security](#security)
8. [Disaster Recovery](#disaster-recovery)
9. [Cost Optimization](#cost-optimization)
10. [Maintenance](#maintenance)

---

## Overview

Summit uses Infrastructure as Code (IaC) principles to manage all infrastructure components, ensuring reproducibility, version control, and automated provisioning.

### IaC Stack

- **Terraform**: Cloud infrastructure provisioning (AWS, GCP, Azure)
- **Kubernetes**: Container orchestration and workload management
- **Helm**: Kubernetes package management
- **Argo CD**: GitOps continuous delivery
- **Sealed Secrets**: Encrypted secrets management

### Directory Structure

```
summit/
├── terraform/           # Terraform configurations
│   ├── modules/        # Reusable Terraform modules
│   ├── environments/   # Environment-specific configs
│   └── state/          # State backend configs
├── k8s/                # Kubernetes manifests
│   ├── deployments/    # Application deployments
│   ├── services/       # Services and ingress
│   ├── config/         # ConfigMaps and Secrets
│   └── policies/       # Network and security policies
├── helm/               # Helm charts
│   ├── summit/         # Main application chart
│   └── dependencies/   # Third-party charts
└── infra/              # Infrastructure scripts
    ├── aws/            # AWS-specific configs
    ├── terraform/      # Terraform wrappers
    └── scripts/        # Automation scripts
```

---

## Infrastructure Components

### Cloud Resources (AWS)

#### EKS Cluster

```hcl
# terraform/modules/eks/main.tf
resource "aws_eks_cluster" "summit" {
  name     = "summit-${var.environment}"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.28"

  vpc_config {
    subnet_ids              = var.subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = true
    security_group_ids      = [aws_security_group.eks_cluster.id]
  }

  enabled_cluster_log_types = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]

  tags = merge(var.tags, {
    Environment = var.environment
    ManagedBy   = "Terraform"
  })
}
```

#### RDS PostgreSQL

```hcl
# terraform/modules/rds-postgres/main.tf
resource "aws_db_instance" "postgres" {
  identifier     = "summit-${var.environment}-postgres"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.instance_class

  allocated_storage     = var.storage_size
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.rds.arn

  db_name  = "summit"
  username = var.master_username
  password = random_password.master_password.result

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.private.name

  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled    = true

  deletion_protection = var.environment == "production"
  skip_final_snapshot = var.environment != "production"

  tags = var.tags
}
```

#### S3 Buckets

```hcl
# terraform/modules/s3/main.tf
resource "aws_s3_bucket" "artifacts" {
  bucket = "summit-${var.environment}-artifacts"

  tags = merge(var.tags, {
    Purpose = "Application artifacts and backups"
  })
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

### Kubernetes Cluster Configuration

#### Node Groups

```yaml
# infra/eks-baseline/nodegroups.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: summit-prod
  region: us-east-1
  version: "1.28"

managedNodeGroups:
  - name: general-purpose
    instanceType: t3.xlarge
    minSize: 3
    maxSize: 10
    desiredCapacity: 5
    volumeSize: 100
    labels:
      role: general
    tags:
      nodegroup-role: general-purpose
    iam:
      withAddonPolicies:
        autoScaler: true
        cloudWatch: true
        ebs: true

  - name: compute-optimized
    instanceTypes:
      - c5.2xlarge
      - c5.4xlarge
    minSize: 2
    maxSize: 20
    desiredCapacity: 3
    volumeSize: 200
    labels:
      role: compute
    taints:
      - key: workload
        value: compute-intensive
        effect: NoSchedule
    tags:
      nodegroup-role: compute-optimized

  - name: memory-optimized
    instanceTypes:
      - r5.2xlarge
      - r5.4xlarge
    minSize: 1
    maxSize: 10
    desiredCapacity: 2
    volumeSize: 200
    labels:
      role: memory
    taints:
      - key: workload
        value: memory-intensive
        effect: NoSchedule
    tags:
      nodegroup-role: memory-optimized
```

#### Cluster Autoscaler

```yaml
# k8s/autoscaling/cluster-autoscaler.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
        - name: cluster-autoscaler
          image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.28.0
          command:
            - ./cluster-autoscaler
            - --v=4
            - --stderrthreshold=info
            - --cloud-provider=aws
            - --skip-nodes-with-local-storage=false
            - --expander=least-waste
            - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/summit-prod
            - --balance-similar-node-groups
            - --skip-nodes-with-system-pods=false
          resources:
            limits:
              cpu: 100m
              memory: 600Mi
            requests:
              cpu: 100m
              memory: 600Mi
```

---

## Terraform Configuration

### Project Structure

```
terraform/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   ├── staging/
│   └── production/
├── modules/
│   ├── eks/
│   ├── rds-postgres/
│   ├── s3/
│   ├── vpc/
│   └── security/
└── scripts/
    ├── apply.sh
    ├── plan.sh
    └── destroy.sh
```

### Environment Configuration

#### Development

```hcl
# terraform/environments/dev/terraform.tfvars
environment = "dev"
region      = "us-east-1"

# EKS
eks_cluster_version = "1.28"
eks_node_groups = {
  general = {
    instance_types = ["t3.medium"]
    min_size       = 1
    max_size       = 5
    desired_size   = 2
  }
}

# RDS
rds_instance_class = "db.t3.medium"
rds_storage_size   = 100
rds_multi_az       = false

# Cost optimization
enable_nat_gateway     = false
enable_flow_logs       = false
enable_backup_vault    = false
```

#### Production

```hcl
# terraform/environments/production/terraform.tfvars
environment = "production"
region      = "us-east-1"

# EKS
eks_cluster_version = "1.28"
eks_node_groups = {
  general = {
    instance_types = ["t3.xlarge"]
    min_size       = 3
    max_size       = 10
    desired_size   = 5
  }
  compute = {
    instance_types = ["c5.2xlarge"]
    min_size       = 2
    max_size       = 20
    desired_size   = 3
  }
}

# RDS
rds_instance_class = "db.r5.2xlarge"
rds_storage_size   = 500
rds_multi_az       = true

# High availability
enable_nat_gateway     = true
enable_flow_logs       = true
enable_backup_vault    = true
deletion_protection    = true
```

### Terraform Workflow

```bash
# Initialize
cd terraform/environments/production
terraform init -backend-config=backend.tfvars

# Plan
terraform plan -out=tfplan

# Apply
terraform apply tfplan

# Destroy (with confirmation)
terraform destroy

# Using wrapper scripts
./terraform/scripts/apply.sh production

# Import existing resources
terraform import aws_eks_cluster.summit summit-production
```

### State Management

```hcl
# terraform/environments/production/backend.tf
terraform {
  backend "s3" {
    bucket         = "summit-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "summit-terraform-locks"
    kms_key_id     = "arn:aws:kms:us-east-1:xxx:key/xxx"
  }
}
```

---

## Container Registry

### GitHub Container Registry

```bash
# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Build and push
docker build -t ghcr.io/brianclong/summit:v1.2.3 -f Dockerfile.optimized .
docker push ghcr.io/brianclong/summit:v1.2.3

# Pull
docker pull ghcr.io/brianclong/summit:v1.2.3
```

### Image Signing and Verification

```bash
# Sign image with Cosign
cosign sign ghcr.io/brianclong/summit:v1.2.3

# Verify signature
cosign verify ghcr.io/brianclong/summit:v1.2.3

# Generate SBOM
syft ghcr.io/brianclong/summit:v1.2.3 -o spdx-json > sbom.json

# Attach SBOM
cosign attach sbom --sbom sbom.json ghcr.io/brianclong/summit:v1.2.3
```

### Registry Configuration in Kubernetes

```yaml
# k8s/secrets/registry-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-credentials
  namespace: intelgraph-prod
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-docker-config>
```

---

## Networking

### VPC Configuration

```hcl
# terraform/modules/vpc/main.tf
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.2"

  name = "summit-${var.environment}"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs
  database_subnets = var.database_subnet_cidrs

  enable_nat_gateway   = var.enable_nat_gateway
  single_nat_gateway   = var.environment != "production"
  enable_dns_hostnames = true
  enable_dns_support   = true

  enable_flow_log                      = var.enable_flow_logs
  create_flow_log_cloudwatch_iam_role  = var.enable_flow_logs
  create_flow_log_cloudwatch_log_group = var.enable_flow_logs

  tags = merge(var.tags, {
    "kubernetes.io/cluster/summit-${var.environment}" = "shared"
  })

  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }
}
```

### Service Mesh (Istio)

```yaml
# k8s/service-mesh/istio-installation.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-control-plane
  namespace: istio-system
spec:
  profile: production

  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5

    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          service:
            type: LoadBalancer
            annotations:
              service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 1Gi
          hpaSpec:
            minReplicas: 3
            maxReplicas: 10

  meshConfig:
    enableTracing: true
    accessLogFile: /dev/stdout
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
      tracing:
        zipkin:
          address: jaeger-collector.observability:9411
```

### Network Policies

```yaml
# k8s/network-policy/summit-network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: summit-network-policy
  namespace: intelgraph-prod
spec:
  podSelector:
    matchLabels:
      app: summit

  policyTypes:
    - Ingress
    - Egress

  ingress:
    # Allow from ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress
      ports:
        - protocol: TCP
          port: 3000

    # Allow from monitoring
    - from:
        - namespaceSelector:
            matchLabels:
              name: monitoring
      ports:
        - protocol: TCP
          port: 9090

  egress:
    # Allow DNS
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: UDP
          port: 53

    # Allow to databases
    - to:
        - podSelector:
            matchLabels:
              app: neo4j
      ports:
        - protocol: TCP
          port: 7687

    - to:
        - podSelector:
            matchLabels:
              app: postgresql
      ports:
        - protocol: TCP
          port: 5432

    # Allow HTTPS egress
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 80
```

---

## Security

### IAM Roles and Policies

```hcl
# terraform/modules/security/iam.tf
resource "aws_iam_role" "eks_node_group" {
  name = "summit-${var.environment}-eks-node-group"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_group.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_group.name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_group.name
}
```

### Pod Security Standards

```yaml
# k8s/policies/pod-security-standards.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: intelgraph-prod
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Secrets Management

```yaml
# k8s/secrets/sealed-secret-example.yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: summit-secrets
  namespace: intelgraph-prod
spec:
  encryptedData:
    DATABASE_URL: AgBx7... # encrypted
    JWT_SECRET: AgBy8...   # encrypted
    API_KEY: AgCz9...       # encrypted
  template:
    metadata:
      name: summit-secrets
      namespace: intelgraph-prod
    type: Opaque
```

---

## Disaster Recovery

### Backup Strategy

```yaml
# k8s/backups/velero-schedule.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: summit-daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  template:
    includedNamespaces:
      - intelgraph-prod
    includeClusterResources: true
    storageLocation: aws-s3
    volumeSnapshotLocations:
      - aws-ebs
    ttl: 720h  # 30 days
```

### Restore Procedure

```bash
# List backups
velero backup get

# Restore from backup
velero restore create --from-backup summit-daily-backup-20251120020000

# Check restore status
velero restore describe summit-restore-20251120

# Restore specific namespace
velero restore create --from-backup summit-daily-backup-20251120020000 \
  --include-namespaces intelgraph-prod
```

---

## Cost Optimization

### Resource Right-Sizing

```bash
# Analyze resource usage
kubectl top nodes
kubectl top pods -n intelgraph-prod

# Get resource recommendations
kubectl resource-capacity --util --sort cpu.util
```

### Spot Instances

```hcl
# terraform/modules/eks/spot-nodegroup.tf
resource "aws_eks_node_group" "spot" {
  cluster_name    = aws_eks_cluster.summit.name
  node_group_name = "spot-${var.environment}"
  node_role_arn   = aws_iam_role.eks_node_group.arn
  subnet_ids      = var.private_subnet_ids

  capacity_type = "SPOT"

  scaling_config {
    desired_size = 3
    max_size     = 10
    min_size     = 1
  }

  instance_types = ["t3.xlarge", "t3a.xlarge", "t2.xlarge"]
}
```

---

## Maintenance

### Upgrade Procedures

```bash
# Check current versions
kubectl version
helm version

# Upgrade Kubernetes cluster
eksctl upgrade cluster --name summit-prod --version 1.29 --approve

# Upgrade node groups
eksctl upgrade nodegroup --cluster summit-prod --name general-purpose

# Update Helm charts
helm repo update
helm upgrade summit ./helm/summit --version 1.1.0
```

---

**Last Updated**: 2025-11-20
**Maintained By**: Summit Infrastructure Team
