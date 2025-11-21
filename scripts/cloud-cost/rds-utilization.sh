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
