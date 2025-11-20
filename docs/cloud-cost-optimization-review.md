# Cloud Cost Optimization Review

**Date**: 2025-11-20
**Platform**: Amazon Web Services (AWS)
**Primary Region**: us-east-1 (DR: us-west-2)

---

## Executive Summary

**Current Stack Overview**:
- **Compute**: EKS (m6i.large CPU nodes + GPU nodes with Tesla K80)
- **Storage**: S3 (backups, billing data), EBS volumes
- **Databases**: Aurora Serverless v2, RDS PostgreSQL (db.t3.micro), Neo4j, Redis
- **Networking**: Multi-AZ VPC, Single NAT Gateway
- **Container Registry**: ECR with image scanning
- **Analytics**: AWS Glue, Athena

**Identified Cost Pain Points**:
1. **GPU Instances**: Tesla K80 GPUs are legacy/expensive - modern alternatives are 3-5x more cost-efficient
2. **Database Sprawl**: Running 4 database systems (Aurora, RDS, Neo4j, Redis) with potential consolidation opportunities
3. **EKS Node Utilization**: Fixed-size node groups (m6i.large) may be under-utilized during off-peak hours
4. **NAT Gateway**: Single NAT Gateway costs ~$32/mo + data transfer (already optimized vs. HA setup)
5. **S3 Storage**: Lifecycle policies exist but may not cover all buckets; backup retention could be optimized

---

## Section 1: Cost Audit Checklist

### 1.1 Compute (EKS & EC2)

#### EKS Cluster
- [ ] **Node Utilization**: Verify CPU/memory utilization across all node groups
  - Target: >60% average utilization
  - Check HPA (Horizontal Pod Autoscaler) effectiveness
- [ ] **Right-Sizing**: Compare requested vs. actual resource usage for pods
  - Review `resources.requests` vs. `resources.limits` in Helm charts
  - Identify over-provisioned pods
- [ ] **Spot Instances**: Confirm spot instance adoption rate
  - Target: 70%+ of non-critical workloads on spot
  - Verify spot interruption handling
- [ ] **GPU Workloads**: Audit GPU instance usage
  - Check utilization metrics (`nvidia-smi` or DCGM)
  - Validate GPU is required vs. CPU inference
  - Consider switching from K80 to T4/A10G/Inferentia
- [ ] **Instance Types**: Review node group instance families
  - Evaluate Graviton2/3 (ARM) for 20-40% cost savings
  - Consider Karpenter for dynamic node provisioning
- [ ] **Idle Nodes**: Identify nodes with <10% utilization
- [ ] **Node Group Scaling**: Review min/max/desired counts
  - Check if minimum node counts can be reduced during off-hours

#### Auto-Scaling Configuration
- [ ] **HPA Metrics**: Verify HPA is using appropriate metrics (CPU/memory/custom)
- [ ] **KEDA**: Confirm KEDA autoscalers are configured for event-driven workloads
- [ ] **Cluster Autoscaler**: Check CA logs for unschedulable pods or scale-down delays

### 1.2 Storage

#### S3 Buckets
- [ ] **Lifecycle Policies**: Audit all buckets for lifecycle rules
  - Backups: Transition to Glacier after 30 days
  - Logs: Expire after 90 days
  - Billing data: Transition to Intelligent-Tiering
- [ ] **Intelligent-Tiering**: Enable for unpredictable access patterns
- [ ] **Versioning**: Review versioning on buckets - disable if not needed
  - Implement lifecycle rules for old versions (delete after 30 days)
- [ ] **Incomplete Multipart Uploads**: Clean up incomplete uploads (cost leakage)
- [ ] **Storage Class**: Confirm appropriate storage class per bucket
  - Standard, Standard-IA, One Zone-IA, Glacier, Deep Archive
- [ ] **Requester Pays**: Enable for public datasets consumed by external users
- [ ] **S3 Analytics**: Review S3 Storage Class Analysis recommendations

#### EBS Volumes
- [ ] **Unattached Volumes**: Identify orphaned EBS volumes from deleted instances
- [ ] **Snapshots**: Audit snapshot retention policies
  - Delete snapshots older than 90 days (except compliance-required)
  - Use Data Lifecycle Manager (DLM) for automation
- [ ] **Volume Type**: Verify gp3 is used instead of gp2 (20% cheaper, better performance)
- [ ] **Volume Size**: Check for over-provisioned volumes (>50% free space)
- [ ] **IOPS Provisioning**: Review provisioned IOPS (io1/io2) - switch to gp3 if <16k IOPS

### 1.3 Databases

#### Aurora Serverless v2
- [ ] **ACU Scaling**: Review min/max ACU settings (currently 1-16)
  - Monitor actual ACU usage; reduce max if consistently <50%
- [ ] **Instance Count**: Validate 2 instances are required for HA
  - Consider 1 instance for dev/staging environments
- [ ] **Backup Retention**: 14 days is configured - evaluate if 7 days is sufficient
- [ ] **Snapshot Deletion**: Clean up old manual snapshots

#### RDS PostgreSQL
- [ ] **Instance Class**: db.t3.micro is cost-effective, but check CPU credits
  - If credit balance depletes, consider t3.small or Reserved Instances
- [ ] **Multi-AZ**: Currently disabled (good for cost) - verify acceptable for workload
- [ ] **Performance Insights**: Enabled by default - disable if unused
- [ ] **Backup Retention**: 7 days configured - acceptable or reduce to 3 days for non-prod
- [ ] **Storage Type**: Confirm gp3 instead of gp2/io1
- [ ] **Reserved Instances**: If 24/7 production workload, commit to 1-year RI (40% savings)

#### Self-Managed Databases (Neo4j, Redis)
- [ ] **Pod Resource Utilization**: Check CPU/memory usage for Neo4j and Redis pods
- [ ] **Persistent Volume Claims**: Review PVC sizes for over-provisioning
- [ ] **Replication Factor**: Validate if 3-replica setup is necessary (vs. 2 or 1+snapshot)
- [ ] **Backup Frequency**: Neo4j backs up to S3 - audit backup cadence
- [ ] **Caching Strategy**: Review Redis cache hit rate; if low, reduce instance size

### 1.4 Networking

#### VPC & NAT Gateway
- [ ] **NAT Gateway Data Transfer**: Monitor GB processed (billed at $0.045/GB)
  - Consider VPC endpoints for S3/DynamoDB/ECR to bypass NAT
  - Evaluate NAT instances (t3.nano) for dev/staging (~80% cheaper)
- [ ] **Elastic IPs**: Identify unattached EIPs ($0.005/hr = $3.60/mo each)
- [ ] **Data Transfer Costs**: Review inter-AZ traffic
  - Prefer same-AZ communication where latency allows
  - Use VPC endpoints to avoid NAT Gateway charges
- [ ] **Load Balancers**: Audit ALB/NLB usage
  - Check for idle load balancers (0 requests/day)
  - Consider LCU (Load Balancer Capacity Units) optimization

#### VPC Endpoints
- [ ] **S3 Gateway Endpoint**: Free, eliminates NAT charges for S3 traffic
- [ ] **ECR Interface Endpoints**: Reduce NAT costs for container image pulls
- [ ] **Secrets Manager/SSM Endpoints**: If heavy usage, can reduce NAT costs

### 1.5 Container Registry (ECR)

- [ ] **Image Lifecycle**: Implement lifecycle policies to delete old images
  - Keep last 10 tagged images, delete untagged after 14 days
- [ ] **Image Scanning**: Enabled on push - verify necessary (adds cost)
- [ ] **Cross-Region Replication**: Check if replicating to us-west-2 DR region unnecessarily

### 1.6 Monitoring & Analytics

#### Observability Stack
- [ ] **Prometheus Retention**: 15 days configured - reduce to 7 days if acceptable
- [ ] **Metrics Volume**: Audit cardinality of custom metrics (high cardinality = high cost)
- [ ] **Grafana Dashboards**: Review if all dashboards are actively used
- [ ] **Jaeger Trace Sampling**: Confirm appropriate sampling rate (<100% for production)

#### AWS Glue & Athena
- [ ] **Glue Crawler Frequency**: Audit crawler schedules - reduce if daily is overkill
- [ ] **Athena Query Volume**: Review query costs; implement result caching
- [ ] **Data Format**: Confirm Parquet format for billing data (columnar = cheaper queries)

### 1.7 Security & Compliance

- [ ] **KMS Key Rotation**: Automatic rotation enabled - necessary for all keys?
- [ ] **CloudTrail Logging**: Review if all events are needed or can be filtered
- [ ] **VPC Flow Logs**: Audit retention period (default is indefinite)

### 1.8 CI/CD & Developer Tools

- [ ] **GitHub Actions Minutes**: Review workflow efficiency
  - Current CI budget controller is active - verify thresholds
- [ ] **ECR Image Storage**: Old images consume storage - enforce lifecycle policy
- [ ] **Build Artifact Caching**: Verify Docker layer caching is enabled

---

## Section 2: Discovery Scripts & CLI Commands

### 2.1 Compute: Idle & Under-Utilized Instances

#### **Script 1: EKS Node Utilization Report**

```bash
#!/bin/bash
# File: scripts/cloud-cost/eks-node-utilization.sh
# Description: Identify under-utilized EKS nodes

echo "=== EKS Node Utilization Report ==="
echo "Generated: $(date)"
echo ""

# Get all nodes
kubectl get nodes -o json | jq -r '.items[] |
  .metadata.name as $node |
  .status.allocatable.cpu as $cpu |
  .status.allocatable.memory as $mem |
  "Node: \($node)\nAllocatable CPU: \($cpu)\nAllocatable Memory: \($mem)\n---"'

echo ""
echo "=== Pod Resource Requests vs. Allocatable ==="

# Get resource requests per node
kubectl describe nodes | grep -A 5 "Allocated resources" | grep -E "(cpu|memory)" | head -20

echo ""
echo "=== Nodes with <40% CPU Utilization (Last 6 Hours) ==="

# Requires metrics-server installed
kubectl top nodes | awk '{if (NR>1 && $3+0 < 40) print $0}'

echo ""
echo "=== Recommendations ==="
echo "- Nodes with <40% CPU: Consider downsizing instance type"
echo "- Nodes with <20% CPU: Candidate for spot instances or removal"
echo "- Check if HPA is properly configured to scale down during off-peak"
```

#### **Script 2: GPU Utilization Check**

```bash
#!/bin/bash
# File: scripts/cloud-cost/gpu-utilization.sh
# Description: Monitor GPU usage and identify waste

echo "=== GPU Utilization Report ==="

# Find all pods requesting GPUs
GPU_PODS=$(kubectl get pods -A -o json | jq -r '.items[] |
  select(.spec.containers[].resources.limits."nvidia.com/gpu" != null) |
  "\(.metadata.namespace)/\(.metadata.name)"')

if [ -z "$GPU_PODS" ]; then
  echo "No GPU pods found"
  exit 0
fi

echo "GPU Pods:"
echo "$GPU_PODS"
echo ""

# For each GPU pod, check utilization
for POD in $GPU_PODS; do
  NAMESPACE=$(echo $POD | cut -d'/' -f1)
  POD_NAME=$(echo $POD | cut -d'/' -f2)

  echo "=== Checking $POD_NAME in $NAMESPACE ==="

  # Execute nvidia-smi in the pod
  kubectl exec -n $NAMESPACE $POD_NAME -- nvidia-smi --query-gpu=utilization.gpu,utilization.memory,temperature.gpu --format=csv,noheader 2>/dev/null || echo "Unable to query GPU (pod may not have nvidia-smi)"

  echo ""
done

echo "=== Recommendations ==="
echo "- GPU utilization <20%: Consider batch processing or CPU-based inference"
echo "- Tesla K80: Upgrade to T4 (3x cheaper) or A10G (5x faster)"
echo "- Memory utilization <30%: Model may fit on smaller GPU"
```

#### **Script 3: Spot Instance Coverage Report**

```bash
#!/bin/bash
# File: scripts/cloud-cost/spot-coverage.sh
# Description: Calculate percentage of workloads on spot instances

echo "=== Spot Instance Coverage Report ==="

TOTAL_NODES=$(kubectl get nodes --no-headers | wc -l)
SPOT_NODES=$(kubectl get nodes -l node.kubernetes.io/instance-type-spot=true --no-headers 2>/dev/null | wc -l)

# Alternative label check
if [ $SPOT_NODES -eq 0 ]; then
  SPOT_NODES=$(kubectl get nodes -l eks.amazonaws.com/capacityType=SPOT --no-headers 2>/dev/null | wc -l)
fi

SPOT_PERCENTAGE=$(echo "scale=2; $SPOT_NODES / $TOTAL_NODES * 100" | bc)

echo "Total Nodes: $TOTAL_NODES"
echo "Spot Nodes: $SPOT_NODES"
echo "Spot Coverage: ${SPOT_PERCENTAGE}%"
echo ""

if (( $(echo "$SPOT_PERCENTAGE < 50" | bc -l) )); then
  echo "⚠️  Spot coverage is below 50% - consider increasing spot adoption"
  echo "   Target: 70% of non-critical workloads"
fi

echo ""
echo "=== Workloads NOT tolerating spot instances ==="
kubectl get pods -A -o json | jq -r '.items[] |
  select(.spec.tolerations // [] |
    all(.key != "node.kubernetes.io/instance-type-spot" and .key != "eks.amazonaws.com/capacityType")
  ) |
  "\(.metadata.namespace)/\(.metadata.name)"' | head -20

echo ""
echo "Consider adding spot tolerations to stateless workloads"
```

### 2.2 Storage: Over-Provisioned & Unused

#### **Script 4: S3 Bucket Cost Analysis**

```bash
#!/bin/bash
# File: scripts/cloud-cost/s3-bucket-analysis.sh
# Description: Analyze S3 bucket sizes and lifecycle policies

echo "=== S3 Bucket Cost Analysis ==="
echo ""

# Requires AWS CLI with appropriate IAM permissions

for BUCKET in $(aws s3 ls | awk '{print $3}'); do
  echo "=== Bucket: $BUCKET ==="

  # Get total size
  SIZE=$(aws s3 ls s3://$BUCKET --recursive --summarize 2>/dev/null | grep "Total Size" | awk '{print $3}')
  SIZE_GB=$(echo "scale=2; $SIZE / 1024 / 1024 / 1024" | bc)

  echo "  Size: ${SIZE_GB} GB"

  # Check lifecycle policy
  LIFECYCLE=$(aws s3api get-bucket-lifecycle-configuration --bucket $BUCKET 2>/dev/null)
  if [ $? -eq 0 ]; then
    echo "  Lifecycle: ✅ Configured"
  else
    echo "  Lifecycle: ❌ NOT CONFIGURED (potential waste)"
  fi

  # Check versioning
  VERSIONING=$(aws s3api get-bucket-versioning --bucket $BUCKET | jq -r '.Status // "Disabled"')
  echo "  Versioning: $VERSIONING"

  # Check storage class distribution
  echo "  Storage Classes:"
  aws s3api list-objects-v2 --bucket $BUCKET --query 'Contents[].StorageClass' --output text 2>/dev/null | sort | uniq -c

  # Check for incomplete multipart uploads
  INCOMPLETE=$(aws s3api list-multipart-uploads --bucket $BUCKET 2>/dev/null | jq '.Uploads | length')
  if [ "$INCOMPLETE" != "null" ] && [ "$INCOMPLETE" -gt 0 ]; then
    echo "  ⚠️  Incomplete Multipart Uploads: $INCOMPLETE (clean up to save costs)"
  fi

  echo ""
done

echo "=== Recommendations ==="
echo "- Buckets without lifecycle policies: Implement transitions to Glacier/IA"
echo "- Large Standard storage: Enable Intelligent-Tiering for unpredictable access"
echo "- Versioned buckets: Add lifecycle rules to delete old versions after 30 days"
```

#### **Script 5: Unattached EBS Volumes**

```bash
#!/bin/bash
# File: scripts/cloud-cost/ebs-orphaned-volumes.sh
# Description: Find unattached EBS volumes and old snapshots

echo "=== Unattached EBS Volumes ==="
echo ""

# Find volumes with status 'available' (not attached)
aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query 'Volumes[*].[VolumeId, Size, VolumeType, CreateTime]' \
  --output table

echo ""
echo "=== Cost Estimate for Unattached Volumes ==="

TOTAL_SIZE=$(aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query 'sum(Volumes[*].Size)' \
  --output text)

# gp3 pricing: $0.08/GB-month
MONTHLY_COST=$(echo "scale=2; $TOTAL_SIZE * 0.08" | bc)

echo "Total Size: ${TOTAL_SIZE} GB"
echo "Estimated Monthly Cost: \$$MONTHLY_COST"
echo ""

echo "=== Old EBS Snapshots (>90 days) ==="
echo ""

NINETY_DAYS_AGO=$(date -d '90 days ago' +%Y-%m-%d 2>/dev/null || date -v-90d +%Y-%m-%d)

aws ec2 describe-snapshots \
  --owner-ids self \
  --query "Snapshots[?StartTime<'${NINETY_DAYS_AGO}'].[SnapshotId, VolumeSize, StartTime, Description]" \
  --output table

echo ""
echo "=== Recommendations ==="
echo "- Delete unattached volumes after 7 days (unless tagged for retention)"
echo "- Implement automated snapshot lifecycle using AWS Data Lifecycle Manager"
echo "- Migrate gp2 volumes to gp3 for 20% cost savings"
```

#### **Script 6: PVC Over-Provisioning in Kubernetes**

```bash
#!/bin/bash
# File: scripts/cloud-cost/k8s-pvc-utilization.sh
# Description: Identify over-provisioned Persistent Volume Claims

echo "=== Kubernetes PVC Utilization Report ==="
echo ""

# Get all PVCs
kubectl get pvc -A -o json | jq -r '.items[] |
  "\(.metadata.namespace)|\(.metadata.name)|\(.spec.resources.requests.storage)"' |
while IFS='|' read -r NAMESPACE NAME SIZE; do

  echo "=== PVC: $NAMESPACE/$NAME (Requested: $SIZE) ==="

  # Find pod using this PVC
  POD=$(kubectl get pods -n $NAMESPACE -o json | jq -r --arg pvc "$NAME" '
    .items[] |
    select(.spec.volumes[]?.persistentVolumeClaim.claimName == $pvc) |
    .metadata.name' | head -1)

  if [ -z "$POD" ]; then
    echo "  ❌ No pod using this PVC (orphaned?)"
  else
    echo "  Pod: $POD"

    # Get actual disk usage (requires df in container)
    MOUNT_PATH=$(kubectl get pod -n $NAMESPACE $POD -o json | jq -r --arg pvc "$NAME" '
      .spec.volumes[] |
      select(.persistentVolumeClaim.claimName == $pvc) |
      .name' | head -1)

    # Attempt to get usage
    USAGE=$(kubectl exec -n $NAMESPACE $POD -- df -h 2>/dev/null | grep -v "Filesystem" | awk '{print $5}' | head -1)

    if [ -n "$USAGE" ]; then
      echo "  Usage: $USAGE"
      USAGE_NUM=$(echo $USAGE | sed 's/%//')
      if [ "$USAGE_NUM" -lt 50 ]; then
        echo "  ⚠️  Low utilization - consider reducing PVC size"
      fi
    else
      echo "  Unable to determine usage (pod may not have df command)"
    fi
  fi

  echo ""
done

echo "=== Recommendations ==="
echo "- PVCs with <50% usage: Reduce size to save on EBS costs"
echo "- Orphaned PVCs: Delete if no longer needed"
echo "- Use gp3 storage class instead of gp2"
```

### 2.3 Databases: Right-Sizing & Efficiency

#### **Script 7: RDS & Aurora Utilization**

```bash
#!/bin/bash
# File: scripts/cloud-cost/rds-utilization.sh
# Description: Analyze RDS/Aurora CPU and connection utilization

echo "=== RDS/Aurora Utilization Report ==="
echo ""

# Get all RDS instances
for DB in $(aws rds describe-db-instances --query 'DBInstances[*].DBInstanceIdentifier' --output text); do

  echo "=== Database: $DB ==="

  # Get instance details
  aws rds describe-db-instances \
    --db-instance-identifier $DB \
    --query 'DBInstances[0].[DBInstanceClass, Engine, AllocatedStorage, MultiAZ]' \
    --output text | awk '{print "  Class: "$1"\n  Engine: "$2"\n  Storage: "$3" GB\n  MultiAZ: "$4}'

  # Get CPU utilization (last 7 days average)
  AVG_CPU=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/RDS \
    --metric-name CPUUtilization \
    --dimensions Name=DBInstanceIdentifier,Value=$DB \
    --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -u -v-7d +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 86400 \
    --statistics Average \
    --query 'Datapoints[*].Average' \
    --output text | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')

  echo "  Avg CPU (7 days): ${AVG_CPU}%"

  # Get database connections
  AVG_CONN=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/RDS \
    --metric-name DatabaseConnections \
    --dimensions Name=DBInstanceIdentifier,Value=$DB \
    --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -u -v-7d +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 86400 \
    --statistics Average \
    --query 'Datapoints[*].Average' \
    --output text | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')

  echo "  Avg Connections: ${AVG_CONN}"

  # Recommendations
  if (( $(echo "$AVG_CPU < 20" | bc -l) )); then
    echo "  ⚠️  Low CPU utilization - consider downsizing instance class"
  fi

  echo ""
done

echo "=== Aurora Serverless v2 ACU Usage ==="

# Get Aurora clusters
for CLUSTER in $(aws rds describe-db-clusters --query 'DBClusters[?EngineMode==`provisioned`].DBClusterIdentifier' --output text); do

  echo "=== Cluster: $CLUSTER ==="

  # Get ACU utilization
  AVG_ACU=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/RDS \
    --metric-name ServerlessDatabaseCapacity \
    --dimensions Name=DBClusterIdentifier,Value=$CLUSTER \
    --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -u -v-7d +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 3600 \
    --statistics Average,Maximum \
    --query 'Datapoints[*].[Average, Maximum]' \
    --output text | awk '{sum_avg+=$1; sum_max+=$2; count++} END {if(count>0) print "Avg: "sum_avg/count" | Max: "sum_max/count; else print "N/A"}')

  echo "  ACU Usage: $AVG_ACU"
  echo ""
done

echo "=== Recommendations ==="
echo "- RDS with <20% CPU: Downsize instance class or switch to Aurora Serverless"
echo "- Low connection count: Consider connection pooling to reduce instance size"
echo "- Aurora Serverless: If max ACU never reaches limit, reduce max setting"
```

#### **Script 8: Neo4j & Redis Pod Metrics**

```bash
#!/bin/bash
# File: scripts/cloud-cost/database-pod-metrics.sh
# Description: Check Neo4j and Redis resource usage

echo "=== Self-Managed Database Pod Metrics ==="
echo ""

# Neo4j pods
echo "=== Neo4j Pods ==="
kubectl get pods -A -l app=neo4j -o json | jq -r '.items[] |
  "\(.metadata.namespace)/\(.metadata.name)"' | while read POD; do

  NAMESPACE=$(echo $POD | cut -d'/' -f1)
  POD_NAME=$(echo $POD | cut -d'/' -f2)

  echo "Pod: $POD"

  # Get resource requests and limits
  kubectl get pod -n $NAMESPACE $POD_NAME -o json | jq -r '
    .spec.containers[0].resources |
    "  Requests: \(.requests.cpu // "none") CPU, \(.requests.memory // "none") Memory\n  Limits: \(.limits.cpu // "none") CPU, \(.limits.memory // "none") Memory"'

  # Get actual usage
  USAGE=$(kubectl top pod -n $NAMESPACE $POD_NAME 2>/dev/null | tail -1)
  if [ -n "$USAGE" ]; then
    echo "  Actual: $USAGE"
  fi

  echo ""
done

# Redis pods
echo "=== Redis Pods ==="
kubectl get pods -A -l app=redis -o json | jq -r '.items[] |
  "\(.metadata.namespace)/\(.metadata.name)"' | while read POD; do

  NAMESPACE=$(echo $POD | cut -d'/' -f1)
  POD_NAME=$(echo $POD | cut -d'/' -f2)

  echo "Pod: $POD"

  # Get resource requests and limits
  kubectl get pod -n $NAMESPACE $POD_NAME -o json | jq -r '
    .spec.containers[0].resources |
    "  Requests: \(.requests.cpu // "none") CPU, \(.requests.memory // "none") Memory\n  Limits: \(.limits.cpu // "none") CPU, \(.limits.memory // "none") Memory"'

  # Get actual usage
  USAGE=$(kubectl top pod -n $NAMESPACE $POD_NAME 2>/dev/null | tail -1)
  if [ -n "$USAGE" ]; then
    echo "  Actual: $USAGE"
  fi

  # Redis-specific: Get memory usage from Redis itself
  REDIS_MEM=$(kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli INFO memory 2>/dev/null | grep "used_memory_human" | cut -d':' -f2)
  if [ -n "$REDIS_MEM" ]; then
    echo "  Redis Memory: $REDIS_MEM"
  fi

  echo ""
done

echo "=== Recommendations ==="
echo "- Actual usage <50% of requests: Reduce resource requests"
echo "- Redis memory <50% of limit: Consider smaller instance or eviction policies"
```

### 2.4 Networking: Data Transfer & NAT Costs

#### **Script 9: NAT Gateway Data Transfer Analysis**

```bash
#!/bin/bash
# File: scripts/cloud-cost/nat-gateway-costs.sh
# Description: Analyze NAT Gateway data transfer costs

echo "=== NAT Gateway Cost Analysis ==="
echo ""

# Find NAT Gateways
NAT_GWS=$(aws ec2 describe-nat-gateways \
  --filter "Name=state,Values=available" \
  --query 'NatGateways[*].NatGatewayId' \
  --output text)

for NAT in $NAT_GWS; do
  echo "=== NAT Gateway: $NAT ==="

  # Get bytes processed (last 7 days)
  BYTES=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/NATGateway \
    --metric-name BytesOutToSource \
    --dimensions Name=NatGatewayId,Value=$NAT \
    --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -u -v-7d +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 604800 \
    --statistics Sum \
    --query 'Datapoints[0].Sum' \
    --output text)

  if [ "$BYTES" == "None" ]; then
    BYTES=0
  fi

  GB=$(echo "scale=2; $BYTES / 1024 / 1024 / 1024" | bc)

  # NAT Gateway pricing: $0.045/GB processed
  DATA_COST=$(echo "scale=2; $GB * 0.045" | bc)

  # NAT Gateway hourly charge: $0.045/hour = $32.40/month
  HOURLY_COST=32.40

  TOTAL_COST=$(echo "scale=2; $DATA_COST + $HOURLY_COST" | bc)

  echo "  Data Processed (7 days): ${GB} GB"
  echo "  Estimated Data Cost: \$${DATA_COST}/week"
  echo "  Hourly Charge: \$${HOURLY_COST}/month"
  echo "  Total Est. Monthly Cost: \$${TOTAL_COST}"
  echo ""
done

echo "=== VPC Endpoint Cost Savings Potential ==="
echo ""
echo "Check if VPC Endpoints exist for S3/ECR/Secrets Manager:"
aws ec2 describe-vpc-endpoints --query 'VpcEndpoints[*].[ServiceName, State]' --output table

echo ""
echo "=== Recommendations ==="
echo "- Create S3 Gateway Endpoint (free, eliminates S3 NAT traffic)"
echo "- Create ECR Interface Endpoints if pulling images frequently"
echo "- For dev/staging: Consider NAT instances (t3.nano) instead of NAT Gateway (80% savings)"
```

#### **Script 10: Inter-AZ Data Transfer**

```bash
#!/bin/bash
# File: scripts/cloud-cost/inter-az-traffic.sh
# Description: Identify pods communicating across availability zones

echo "=== Inter-AZ Traffic Analysis ==="
echo ""

# Get nodes and their AZs
echo "=== Node Distribution by AZ ==="
kubectl get nodes -o json | jq -r '.items[] |
  "\(.metadata.labels."topology.kubernetes.io/zone" // .metadata.labels."failure-domain.beta.kubernetes.io/zone") |\(.metadata.name)"' |
sort | uniq -c

echo ""
echo "=== Pods NOT using topology-aware scheduling ==="

# Check for pods without topology spread constraints
kubectl get pods -A -o json | jq -r '
  .items[] |
  select(.spec.topologySpreadConstraints == null) |
  "\(.metadata.namespace)/\(.metadata.name)"' | head -20

echo ""
echo "=== Services without topology-aware hints ==="

# Check services without topology annotations
kubectl get services -A -o json | jq -r '
  .items[] |
  select(.metadata.annotations."service.kubernetes.io/topology-aware-hints" != "auto") |
  "\(.metadata.namespace)/\(.metadata.name)"'

echo ""
echo "=== Recommendations ==="
echo "- Enable topology-aware hints for Services to prefer same-AZ routing"
echo "- Use Pod Topology Spread Constraints to balance pods across AZs"
echo "- For stateful apps, use StatefulSet with volumeClaimTemplates in same AZ"
echo "- Inter-AZ data transfer costs: \$0.01/GB in, \$0.01/GB out"
```

---

## Section 3: Top 5 Cost-Saving Opportunities

| # | Action | Est. Savings | Complexity | Risk | Notes |
|---|--------|--------------|------------|------|-------|
| **1** | **Migrate GPU workloads from Tesla K80 to T4** | **$150-300/mo (60-75%)** | Medium | Low | K80 (p2.xlarge: $0.90/hr) → T4 (g4dn.xlarge: $0.526/hr). T4 is 3x more cost-efficient and faster. Requires testing ML models for compatibility. Consider Inferentia2 for even lower costs ($0.35/hr) if models are PyTorch/TensorFlow. |
| **2** | **Implement VPC Endpoints for S3 and ECR** | **$80-120/mo** | Low | None | Eliminates NAT Gateway data transfer charges for S3 backups and ECR image pulls. S3 Gateway Endpoint is free; ECR Interface Endpoint costs $7.20/mo but saves on NAT data transfer ($0.045/GB). Estimate 2-3 TB/mo traffic reduction. |
| **3** | **Consolidate databases: Migrate Redis to Aurora Serverless or ElastiCache** | **$60-100/mo** | High | Medium | Running Redis as StatefulSet on EKS incurs node costs + management overhead. AWS ElastiCache (cache.t4g.micro: $11/mo) or use Aurora as caching layer (read replicas). Risk: Redis persistence behavior differs from managed service; requires testing. |
| **4** | **Right-size EKS node groups with Karpenter** | **$100-200/mo (20-30%)** | Medium | Low | Replace static node groups with Karpenter for dynamic provisioning. Karpenter consolidates pods onto fewer nodes, uses spot instances aggressively, and selects optimal instance types. Current m6i.large nodes may be over-provisioned during off-peak hours. |
| **5** | **Purchase RDS/Aurora Reserved Instances (1-year, no upfront)** | **$40-80/mo (40%)** | Low | Low | If Aurora Serverless is running 24/7 in production, commit to 1-year RI for base capacity. No-upfront option has no financial risk. Savings apply to minimum ACU setting (1 ACU = ~$0.06/hr → $0.036/hr with RI). Also applies to RDS db.t3.micro if it's production workload. |

### Additional Quick Wins (Implement Immediately)

| Action | Est. Savings | Complexity | Risk |
|--------|--------------|------------|------|
| Delete unattached EBS volumes | $10-30/mo | Low | None (snapshot first) |
| Implement S3 lifecycle policies on all buckets | $20-50/mo | Low | None (configure per bucket) |
| Clean up old ECR images (keep last 10 tagged) | $5-15/mo | Low | None (deploy from latest tags) |
| Delete old EBS snapshots (>90 days) | $15-40/mo | Low | Low (verify backup redundancy) |
| Migrate gp2 EBS volumes to gp3 | 20% savings | Low | None (online migration) |
| Enable S3 Intelligent-Tiering for backups | $30-60/mo | Low | None (automatic) |
| Reduce Prometheus retention from 15 to 7 days | $10-20/mo | Low | None (adjust in config) |
| Delete incomplete S3 multipart uploads | $5-10/mo | Low | None (automated cleanup) |

---

## Implementation Roadmap

### Phase 1: Quick Wins (Week 1)
1. ✅ Create VPC endpoints for S3 and ECR
2. ✅ Implement S3 lifecycle policies on all buckets
3. ✅ Delete unattached EBS volumes and old snapshots
4. ✅ Migrate gp2 volumes to gp3
5. ✅ Clean up old ECR images

**Expected Savings**: $100-200/mo

### Phase 2: Compute Optimization (Weeks 2-3)
1. ✅ Deploy Karpenter for dynamic node provisioning
2. ✅ Increase spot instance adoption to 70%+
3. ✅ Right-size pod resource requests based on actual usage
4. ✅ Test GPU workloads on T4 instances (g4dn.xlarge)

**Expected Savings**: $200-400/mo

### Phase 3: Database Consolidation (Week 4)
1. ⚠️ Evaluate ElastiCache for Redis (or Aurora caching)
2. ✅ Purchase Aurora/RDS Reserved Instances for production
3. ✅ Optimize Aurora min/max ACU based on actual usage
4. ✅ Reduce RDS backup retention to 7 days for non-prod

**Expected Savings**: $100-180/mo

### Phase 4: Continuous Optimization (Ongoing)
1. ✅ Set up AWS Cost Anomaly Detection alerts
2. ✅ Implement Kubecost recommendations dashboard
3. ✅ Schedule weekly cost review meetings
4. ✅ Automate idle resource cleanup with Lambda

**Total Estimated Savings**: **$400-780/month (25-40% reduction)**

---

## Monitoring & Alerts

### AWS Cost Anomaly Detection
```bash
# Create anomaly detector for overall spend
aws ce create-anomaly-monitor \
  --anomaly-monitor '{"MonitorName": "TotalSpendMonitor", "MonitorType": "DIMENSIONAL", "MonitorDimension": "SERVICE"}'

# Create alert subscription
aws ce create-anomaly-subscription \
  --anomaly-subscription '{
    "SubscriptionName": "CostAnomalyAlerts",
    "Threshold": 100,
    "Frequency": "DAILY",
    "MonitorArnList": ["arn:aws:ce::ACCOUNT_ID:anomalymonitor/..."],
    "Subscribers": [{"Type": "EMAIL", "Address": "ops@example.com"}]
  }'
```

### Kubecost Dashboard
Access Kubecost at: `http://kubecost-cost-analyzer.kubecost:9090`

Key metrics to monitor:
- **Cost per namespace**: Identify expensive services
- **Idle resource cost**: Unused CPU/memory requests
- **Spot instance savings**: Track actual savings
- **Efficiency score**: Target >70%

---

## Appendix: Tool Installation

### Install kubectl metrics-server (required for `kubectl top`)
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Install Karpenter (for dynamic node provisioning)
```bash
helm repo add karpenter https://charts.karpenter.sh
helm install karpenter karpenter/karpenter \
  --namespace karpenter \
  --create-namespace \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::ACCOUNT:role/KarpenterControllerRole
```

### Install AWS CLI v2 (if not already installed)
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

---

## Next Steps

1. **Review this document** with your DevOps/FinOps team
2. **Run discovery scripts** to baseline current costs and utilization
3. **Prioritize quick wins** from the table above
4. **Create Jira/Linear tickets** for Phase 1-4 implementation
5. **Set up cost monitoring** with AWS Cost Explorer and Kubecost
6. **Schedule monthly cost reviews** to track progress

**Questions or need help implementing?** Reference the script files in `/home/user/summit/scripts/cloud-cost/` or reach out to the infrastructure team.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-20
**Maintained By**: Cloud Cost Optimization Team
