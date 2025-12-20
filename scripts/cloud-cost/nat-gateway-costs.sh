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
