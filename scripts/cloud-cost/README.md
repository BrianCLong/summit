# Cloud Cost Optimization Scripts

This directory contains shell scripts for analyzing AWS and Kubernetes resource utilization to identify cost optimization opportunities.

## Prerequisites

### Required Tools

1. **kubectl** - Kubernetes command-line tool
   ```bash
   kubectl version --client
   ```

2. **AWS CLI v2** - AWS command-line interface
   ```bash
   aws --version
   ```

3. **jq** - JSON processor
   ```bash
   jq --version
   ```

4. **bc** - Basic calculator for numerical computations
   ```bash
   bc --version
   ```

### AWS Configuration

Ensure your AWS credentials are configured:
```bash
aws configure
# Or use environment variables:
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

### Kubernetes Configuration

Ensure kubectl is configured to connect to your EKS cluster:
```bash
aws eks update-kubeconfig --name your-cluster-name --region us-east-1
kubectl get nodes  # Verify connectivity
```

### Kubernetes Metrics Server (for `kubectl top`)

If not already installed:
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

## Script Descriptions

### Compute Analysis

#### 1. `eks-node-utilization.sh`
Identifies under-utilized EKS nodes by analyzing CPU/memory allocation and actual usage.

**Usage:**
```bash
./eks-node-utilization.sh
```

**Output:**
- Allocatable resources per node
- Pod resource requests vs. available capacity
- Nodes with <40% CPU utilization
- Recommendations for downsizing or removing nodes

---

#### 2. `gpu-utilization.sh`
Monitors GPU usage across all pods requesting GPUs.

**Usage:**
```bash
./gpu-utilization.sh
```

**Output:**
- List of GPU pods
- GPU utilization, memory usage, and temperature
- Recommendations for GPU optimization (e.g., K80 → T4 migration)

**Note:** Requires pods to have `nvidia-smi` installed.

---

#### 3. `spot-coverage.sh`
Calculates the percentage of workloads running on spot instances.

**Usage:**
```bash
./spot-coverage.sh
```

**Output:**
- Total nodes vs. spot nodes
- Spot coverage percentage
- Workloads not tolerating spot instances
- Recommendations to increase spot adoption

---

### Storage Analysis

#### 4. `s3-bucket-analysis.sh`
Analyzes S3 bucket sizes, lifecycle policies, and storage classes.

**Usage:**
```bash
./s3-bucket-analysis.sh
```

**Output:**
- Bucket sizes in GB
- Lifecycle policy status
- Versioning status
- Storage class distribution
- Incomplete multipart uploads
- Recommendations for lifecycle optimization

**Required IAM Permissions:**
- `s3:ListBucket`
- `s3:GetBucketLifecycleConfiguration`
- `s3:GetBucketVersioning`
- `s3:ListMultipartUploadParts`

---

#### 5. `ebs-orphaned-volumes.sh`
Finds unattached EBS volumes and old snapshots.

**Usage:**
```bash
./ebs-orphaned-volumes.sh
```

**Output:**
- List of unattached volumes with sizes and types
- Cost estimate for unattached volumes
- Snapshots older than 90 days
- Recommendations for cleanup

**Required IAM Permissions:**
- `ec2:DescribeVolumes`
- `ec2:DescribeSnapshots`

---

#### 6. `k8s-pvc-utilization.sh`
Identifies over-provisioned Persistent Volume Claims in Kubernetes.

**Usage:**
```bash
./k8s-pvc-utilization.sh
```

**Output:**
- PVC sizes and actual disk usage
- Orphaned PVCs (not attached to any pod)
- Recommendations for reducing PVC sizes

**Note:** Requires pods to have `df` command available.

---

### Database Analysis

#### 7. `rds-utilization.sh`
Analyzes RDS and Aurora CPU utilization and connection counts.

**Usage:**
```bash
./rds-utilization.sh
```

**Output:**
- Instance class, engine, storage, and Multi-AZ status
- Average CPU utilization (7-day average)
- Average database connections
- Aurora Serverless v2 ACU usage
- Recommendations for right-sizing

**Required IAM Permissions:**
- `rds:DescribeDBInstances`
- `rds:DescribeDBClusters`
- `cloudwatch:GetMetricStatistics`

---

#### 8. `database-pod-metrics.sh`
Checks Neo4j and Redis resource usage in Kubernetes.

**Usage:**
```bash
./database-pod-metrics.sh
```

**Output:**
- Resource requests and limits for database pods
- Actual CPU/memory usage
- Redis-specific memory usage (from `redis-cli`)
- Recommendations for resource optimization

---

### Networking Analysis

#### 9. `nat-gateway-costs.sh`
Analyzes NAT Gateway data transfer costs.

**Usage:**
```bash
./nat-gateway-costs.sh
```

**Output:**
- NAT Gateway IDs and data processed (last 7 days)
- Estimated data transfer costs
- Total estimated monthly cost
- VPC Endpoint status
- Recommendations for reducing NAT costs

**Required IAM Permissions:**
- `ec2:DescribeNatGateways`
- `ec2:DescribeVpcEndpoints`
- `cloudwatch:GetMetricStatistics`

---

#### 10. `inter-az-traffic.sh`
Identifies pods communicating across availability zones.

**Usage:**
```bash
./inter-az-traffic.sh
```

**Output:**
- Node distribution by availability zone
- Pods without topology-aware scheduling
- Services without topology-aware hints
- Recommendations for reducing inter-AZ traffic

---

## Running All Scripts

To run all scripts in sequence:

```bash
#!/bin/bash
# Run all cost optimization scripts

echo "========================================="
echo "Cloud Cost Optimization Analysis"
echo "Started: $(date)"
echo "========================================="
echo ""

# Compute
./eks-node-utilization.sh > reports/eks-nodes-$(date +%Y%m%d).txt
./gpu-utilization.sh > reports/gpu-$(date +%Y%m%d).txt
./spot-coverage.sh > reports/spot-$(date +%Y%m%d).txt

# Storage
./s3-bucket-analysis.sh > reports/s3-$(date +%Y%m%d).txt
./ebs-orphaned-volumes.sh > reports/ebs-$(date +%Y%m%d).txt
./k8s-pvc-utilization.sh > reports/pvc-$(date +%Y%m%d).txt

# Database
./rds-utilization.sh > reports/rds-$(date +%Y%m%d).txt
./database-pod-metrics.sh > reports/db-pods-$(date +%Y%m%d).txt

# Networking
./nat-gateway-costs.sh > reports/nat-$(date +%Y%m%d).txt
./inter-az-traffic.sh > reports/inter-az-$(date +%Y%m%d).txt

echo "========================================="
echo "Analysis Complete"
echo "Reports saved to reports/ directory"
echo "========================================="
```

## Scheduling Regular Audits

To run these scripts weekly, create a cron job:

```bash
# Edit crontab
crontab -e

# Add entry to run every Monday at 9 AM
0 9 * * 1 cd /home/user/summit/scripts/cloud-cost && ./run-all-audits.sh
```

Or create a Kubernetes CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cost-audit
  namespace: ops
spec:
  schedule: "0 9 * * 1"  # Every Monday at 9 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cost-auditor
          containers:
          - name: cost-audit
            image: your-registry/cost-audit:latest
            command:
            - /bin/bash
            - -c
            - |
              cd /scripts &&
              ./eks-node-utilization.sh &&
              ./gpu-utilization.sh &&
              ./spot-coverage.sh
          restartPolicy: OnFailure
```

## IAM Permissions Summary

For AWS scripts, ensure your IAM user/role has these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLifecycleConfiguration",
        "s3:GetBucketVersioning",
        "s3:ListMultipartUploadParts",
        "ec2:DescribeVolumes",
        "ec2:DescribeSnapshots",
        "ec2:DescribeNatGateways",
        "ec2:DescribeVpcEndpoints",
        "rds:DescribeDBInstances",
        "rds:DescribeDBClusters",
        "cloudwatch:GetMetricStatistics"
      ],
      "Resource": "*"
    }
  ]
}
```

## Kubernetes RBAC

For Kubernetes scripts, create a ServiceAccount with appropriate permissions:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cost-auditor
  namespace: ops
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cost-auditor
rules:
- apiGroups: [""]
  resources: ["nodes", "pods", "persistentvolumeclaims", "services"]
  verbs: ["get", "list"]
- apiGroups: ["metrics.k8s.io"]
  resources: ["nodes", "pods"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cost-auditor
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cost-auditor
subjects:
- kind: ServiceAccount
  name: cost-auditor
  namespace: ops
```

## Troubleshooting

### Issue: "command not found: jq"

**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq

# CentOS/RHEL
sudo yum install jq
```

### Issue: "command not found: bc"

**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get install bc

# macOS
brew install bc

# CentOS/RHEL
sudo yum install bc
```

### Issue: "Unable to connect to the server"

**Solution:**
```bash
# Update kubeconfig
aws eks update-kubeconfig --name your-cluster-name --region us-east-1

# Verify connectivity
kubectl cluster-info
```

### Issue: "metrics-server not available"

**Solution:**
```bash
# Install metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Wait for metrics-server to start
kubectl wait --for=condition=ready pod -l k8s-app=metrics-server -n kube-system --timeout=300s
```

### Issue: AWS CLI returns "An error occurred (UnauthorizedOperation)"

**Solution:**
```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify IAM permissions include required actions (see IAM Permissions Summary above)
```

## Contributing

To add new cost optimization scripts:

1. Follow the naming convention: `<resource-type>-<analysis-type>.sh`
2. Add comprehensive comments explaining the script's purpose
3. Include error handling for missing tools/permissions
4. Output clear recommendations at the end
5. Update this README with usage instructions

## References

- [AWS Cost Optimization Guide](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html)
- [Kubernetes Resource Management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [EKS Best Practices - Cost Optimization](https://aws.github.io/aws-eks-best-practices/cost_optimization/)
- [Main Cost Optimization Review Document](/home/user/summit/docs/cloud-cost-optimization-review.md)

---

**Last Updated**: 2025-11-20
**Maintained By**: Cloud Cost Optimization Team
