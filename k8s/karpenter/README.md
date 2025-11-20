# Karpenter Deployment for EKS

**Cost Optimization Tool**: Dynamic node provisioning and consolidation

**Estimated Savings: $100-200/month (20-30% reduction in compute costs)**

## Overview

Karpenter is a Kubernetes node autoscaler that:
- Provisions just-in-time compute resources
- Automatically consolidates underutilized nodes
- Selects optimal instance types based on pod requirements
- Supports spot instances with intelligent diversification
- Eliminates cluster-autoscaler's node group constraints

### Cost Benefits

**vs. Static Node Groups**:
- Eliminates idle capacity during off-peak hours
- Uses diverse instance types (not just m6i.large)
- Aggressive spot instance adoption (70%+ possible)
- Bin-packing reduces wasted resources

**Example Savings**:
- Before: 10 x m6i.large on-demand 24/7 = $1,314/month
- After: Dynamic provisioning + 70% spot = $460-590/month
- **Savings: $724-854/month (55-65%)**

## Prerequisites

1. **EKS Cluster** - Kubernetes 1.23+
2. **AWS IAM Permissions** - To create roles and policies
3. **kubectl** - Configured for your cluster
4. **Helm 3** - For Karpenter installation
5. **Existing VPC** - With private subnets tagged for Karpenter

## Architecture

```
┌─────────────────────────────────────────────────┐
│              EKS Cluster                        │
│                                                 │
│  ┌──────────────┐         ┌─────────────────┐ │
│  │  Karpenter   │────────▶│  Provisioners   │ │
│  │  Controller  │         │  (CRDs)         │ │
│  └──────────────┘         └─────────────────┘ │
│         │                                       │
│         │ Watches unschedulable pods           │
│         ▼                                       │
│  ┌──────────────────────────────────────────┐ │
│  │     Kubernetes API Server                 │ │
│  └──────────────────────────────────────────┘ │
│         │                                       │
└─────────┼───────────────────────────────────────┘
          │
          ▼
   ┌────────────────────┐
   │    AWS EC2 API     │
   │  - Launch instances│
   │  - Terminate nodes │
   │  - Spot fleet      │
   └────────────────────┘
          │
          ▼
   ┌────────────────────┐
   │   SQS Queue        │
   │  - Spot interrupts │
   │  - Rebalance rec.  │
   └────────────────────┘
```

## Installation

### Step 1: Tag Subnets and Security Groups

```bash
# Tag private subnets
aws ec2 create-tags \
  --resources subnet-xxxxx subnet-yyyyy subnet-zzzzz \
  --tags Key=karpenter.sh/discovery,Value=${CLUSTER_NAME}

# Tag security groups
aws ec2 create-tags \
  --resources sg-xxxxx \
  --tags Key=karpenter.sh/discovery,Value=${CLUSTER_NAME}
```

### Step 2: Create IAM Roles and Policies

```bash
# Set environment variables
export CLUSTER_NAME="your-cluster-name"
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION="us-east-1"

# Create Karpenter node IAM role
cat > karpenter-node-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name "KarpenterNodeRole-${CLUSTER_NAME}" \
  --assume-role-policy-document file://karpenter-node-trust-policy.json

# Attach policies to node role
aws iam attach-role-policy \
  --role-name "KarpenterNodeRole-${CLUSTER_NAME}" \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy

aws iam attach-role-policy \
  --role-name "KarpenterNodeRole-${CLUSTER_NAME}" \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy

aws iam attach-role-policy \
  --role-name "KarpenterNodeRole-${CLUSTER_NAME}" \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly

aws iam attach-role-policy \
  --role-name "KarpenterNodeRole-${CLUSTER_NAME}" \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore

# Create instance profile
aws iam create-instance-profile \
  --instance-profile-name "KarpenterNodeInstanceProfile-${CLUSTER_NAME}"

aws iam add-role-to-instance-profile \
  --instance-profile-name "KarpenterNodeInstanceProfile-${CLUSTER_NAME}" \
  --role-name "KarpenterNodeRole-${CLUSTER_NAME}"

# Create Karpenter controller IAM policy
cat > karpenter-controller-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateFleet",
        "ec2:CreateLaunchTemplate",
        "ec2:CreateTags",
        "ec2:DescribeAvailabilityZones",
        "ec2:DescribeImages",
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceTypeOfferings",
        "ec2:DescribeInstanceTypes",
        "ec2:DescribeLaunchTemplates",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeSpotPriceHistory",
        "ec2:DescribeSubnets",
        "ec2:RunInstances",
        "ec2:TerminateInstances",
        "ec2:DeleteLaunchTemplate"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "ec2:RunInstances",
      "Resource": [
        "arn:aws:ec2:*:${AWS_ACCOUNT_ID}:launch-template/*",
        "arn:aws:ec2:*::image/*",
        "arn:aws:ec2:*:${AWS_ACCOUNT_ID}:network-interface/*",
        "arn:aws:ec2:*:${AWS_ACCOUNT_ID}:security-group/*",
        "arn:aws:ec2:*:${AWS_ACCOUNT_ID}:volume/*",
        "arn:aws:ec2:*:${AWS_ACCOUNT_ID}:subnet/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/KarpenterNodeRole-${CLUSTER_NAME}"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl",
        "sqs:ReceiveMessage"
      ],
      "Resource": "arn:aws:sqs:${AWS_REGION}:${AWS_ACCOUNT_ID}:${CLUSTER_NAME}-karpenter"
    },
    {
      "Effect": "Allow",
      "Action": "pricing:GetProducts",
      "Resource": "*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name "KarpenterControllerPolicy-${CLUSTER_NAME}" \
  --policy-document file://karpenter-controller-policy.json

# Create IRSA (IAM Roles for Service Accounts)
eksctl create iamserviceaccount \
  --cluster="${CLUSTER_NAME}" \
  --namespace=karpenter \
  --name=karpenter \
  --attach-policy-arn="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/KarpenterControllerPolicy-${CLUSTER_NAME}" \
  --approve \
  --override-existing-serviceaccounts
```

### Step 3: Create SQS Queue for Spot Interruptions

```bash
# Create SQS queue
aws sqs create-queue \
  --queue-name "${CLUSTER_NAME}-karpenter" \
  --attributes MessageRetentionPeriod=300

# Create EventBridge rule for spot interruptions
cat > spot-interruption-rule.json <<EOF
{
  "source": ["aws.ec2"],
  "detail-type": ["EC2 Spot Instance Interruption Warning", "EC2 Instance Rebalance Recommendation"]
}
EOF

aws events put-rule \
  --name "${CLUSTER_NAME}-karpenter-spot-interruption" \
  --event-pattern file://spot-interruption-rule.json

# Add SQS as target
QUEUE_ARN=$(aws sqs get-queue-attributes \
  --queue-url "https://sqs.${AWS_REGION}.amazonaws.com/${AWS_ACCOUNT_ID}/${CLUSTER_NAME}-karpenter" \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

aws events put-targets \
  --rule "${CLUSTER_NAME}-karpenter-spot-interruption" \
  --targets "Id=1,Arn=${QUEUE_ARN}"
```

### Step 4: Install Karpenter with Helm

```bash
# Add Karpenter Helm repo
helm repo add karpenter https://charts.karpenter.sh
helm repo update

# Create namespace
kubectl create namespace karpenter

# Get cluster endpoint
CLUSTER_ENDPOINT=$(aws eks describe-cluster \
  --name ${CLUSTER_NAME} \
  --query 'cluster.endpoint' \
  --output text)

# Install Karpenter
helm upgrade --install karpenter karpenter/karpenter \
  --namespace karpenter \
  --create-namespace \
  --version 0.33.0 \
  --values /home/user/summit/helm/karpenter/values.yaml \
  --set settings.aws.clusterName=${CLUSTER_NAME} \
  --set settings.aws.clusterEndpoint=${CLUSTER_ENDPOINT} \
  --set settings.aws.defaultInstanceProfile=KarpenterNodeInstanceProfile-${CLUSTER_NAME} \
  --set settings.aws.interruptionQueueName=${CLUSTER_NAME}-karpenter \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="arn:aws:iam::${AWS_ACCOUNT_ID}:role/karpenter-controller-${CLUSTER_NAME}"

# Verify installation
kubectl get pods -n karpenter
kubectl logs -f -n karpenter -l app.kubernetes.io/name=karpenter
```

### Step 5: Deploy Provisioners

```bash
# Deploy general-purpose provisioner
envsubst < /home/user/summit/k8s/karpenter/provisioner-general.yaml | kubectl apply -f -

# Deploy spot-only provisioner
envsubst < /home/user/summit/k8s/karpenter/provisioner-spot.yaml | kubectl apply -f -

# Deploy GPU provisioner (if needed)
envsubst < /home/user/summit/k8s/karpenter/provisioner-gpu.yaml | kubectl apply -f -

# Verify provisioners
kubectl get provisioners
kubectl get awsnodetemplates
```

## Provisioner Strategies

### 1. General Purpose Provisioner

**Use Case**: Most workloads (web apps, APIs, workers)

**Features**:
- Mix of spot (70%) and on-demand (30%)
- Instance families: c, m, r (6th gen+)
- Supports AMD64 and ARM64 (Graviton)
- Automatic consolidation

**Cost**: $0.03-0.10/hour (vs. $0.096 for m6i.large)

### 2. Spot-Only Provisioner

**Use Case**: Batch jobs, CI/CD, non-critical workloads

**Features**:
- 100% spot instances
- 70% savings vs. on-demand
- Aggressive consolidation
- Handles interruptions gracefully

**Cost**: $0.01-0.03/hour

**Usage**:
```yaml
spec:
  nodeSelector:
    workload-type: spot
  tolerations:
    - key: karpenter.sh/spot
      operator: Exists
```

### 3. GPU Provisioner

**Use Case**: ML inference, training

**Features**:
- g4dn (T4) or g5 (A10G) instances
- Spot available for 60-70% savings
- Automatic NVIDIA driver installation

**Cost**:
- g4dn.xlarge: $0.526/hour (T4)
- g4dn.xlarge spot: $0.16/hour (70% savings)
- vs. p2.xlarge (K80): $0.90/hour

**Usage**:
```yaml
spec:
  nodeSelector:
    workload-type: gpu
  tolerations:
    - key: nvidia.com/gpu
      operator: Exists
  resources:
    limits:
      nvidia.com/gpu: 1
```

## Migrating from Cluster Autoscaler

### Step 1: Deploy Karpenter (in parallel)

```bash
# Karpenter and CA can coexist
# CA manages existing node groups
# Karpenter provisions new nodes
```

### Step 2: Cordon Existing Node Groups

```bash
# Prevent new pods on old nodes
for node in $(kubectl get nodes -l eks.amazonaws.com/nodegroup=old-nodegroup -o name); do
  kubectl cordon $node
done
```

### Step 3: Drain Nodes Gradually

```bash
# Drain one node at a time
kubectl drain <node-name> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --force \
  --timeout=300s

# Karpenter will provision replacement capacity
```

### Step 4: Delete Old Node Groups

```bash
# Once all workloads migrated
aws eks delete-nodegroup \
  --cluster-name ${CLUSTER_NAME} \
  --nodegroup-name old-nodegroup

# Uninstall cluster-autoscaler
kubectl delete deployment cluster-autoscaler -n kube-system
```

## Workload Configuration

### Specify Resource Requests (Critical!)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
    - name: app
      image: my-app:latest
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: 1000m
          memory: 2Gi
```

**Why**: Karpenter selects instances based on pod requests

### Use Node Selectors for Spot

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: batch-job
spec:
  nodeSelector:
    workload-type: spot
  tolerations:
    - key: karpenter.sh/spot
      operator: Exists
  containers:
    - name: worker
      image: batch-worker:latest
```

### Anti-Affinity for HA

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: api-server
                topologyKey: kubernetes.io/hostname
```

## Monitoring

### CloudWatch Metrics

```bash
# View Karpenter metrics in CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace Karpenter \
  --metric-name karpenter_nodes_created \
  --dimensions Name=provisioner,Value=general-purpose \
  --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum
```

### Karpenter Logs

```bash
# View provisioning decisions
kubectl logs -f -n karpenter -l app.kubernetes.io/name=karpenter

# Filter for consolidation events
kubectl logs -n karpenter -l app.kubernetes.io/name=karpenter | grep consolidation
```

### Prometheus Metrics

Karpenter exposes metrics on port 8080:
- `karpenter_nodes_created`
- `karpenter_nodes_terminated`
- `karpenter_pods_startup_time_seconds`
- `karpenter_consolidation_actions`

```yaml
# ServiceMonitor for Prometheus
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: karpenter
  namespace: karpenter
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: karpenter
  endpoints:
    - port: http-metrics
      interval: 30s
```

## Cost Tracking

### Before Karpenter (Baseline)

```bash
# Calculate current compute costs
kubectl top nodes
# Sum total allocatable CPU/memory
# Current cost: ~$1,314/month (10 x m6i.large)
```

### After 30 Days

```bash
# Compare node counts and types
kubectl get nodes -o wide

# Check spot usage
kubectl get nodes -L karpenter.sh/capacity-type

# Expected: 70% spot, 30% on-demand
# Expected cost: $460-590/month (55-65% savings)
```

## Troubleshooting

### Issue: Pods remain pending

**Check**:
```bash
kubectl describe pod <pending-pod>
# Look for Events section

kubectl logs -n karpenter -l app.kubernetes.io/name=karpenter | grep <pod-name>
```

**Common causes**:
- No provisioner matches pod requirements
- Resource requests too large
- Taints/tolerations mismatch

### Issue: Nodes not consolidating

**Check consolidation settings**:
```bash
kubectl get provisioner general-purpose -o yaml
# Ensure consolidation.enabled: true
```

**Force consolidation**:
```bash
# Consolidation runs every 10s by default
# Wait 1-2 minutes for consolidation to detect opportunity
```

### Issue: Spot interruptions causing disruptions

**Solution**: Use Pod Disruption Budgets
```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-server-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api-server
```

## Best Practices

1. **Always set resource requests** - Karpenter can't provision without them
2. **Use spot for stateless workloads** - 70% cost savings
3. **Enable consolidation** - Automatic bin-packing
4. **Mix on-demand and spot** - Balance cost and reliability
5. **Use Pod Disruption Budgets** - Graceful handling of spot interruptions
6. **Monitor Karpenter logs** - Understand provisioning decisions
7. **Start with general provisioner** - Add specialized provisioners as needed
8. **Use Graviton instances** - 20-40% additional savings

## References

- [Karpenter Documentation](https://karpenter.sh/)
- [AWS EKS Best Practices - Karpenter](https://aws.github.io/aws-eks-best-practices/karpenter/)
- [Cost Optimization Review](/home/user/summit/docs/cloud-cost-optimization-review.md)

---

**Last Updated**: 2025-11-20
