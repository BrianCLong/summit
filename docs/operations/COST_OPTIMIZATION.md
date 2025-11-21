# Cloud Cost Optimization Guide

## Overview

This guide covers cost optimization strategies, tools, and best practices for Summit's multi-cloud infrastructure.

## Table of Contents

1. [Cost Optimization Service](#cost-optimization-service)
2. [Tagging Strategy](#tagging-strategy)
3. [Rightsizing](#rightsizing)
4. [Reserved Instances and Savings Plans](#reserved-instances-and-savings-plans)
5. [Spot Instances](#spot-instances)
6. [Idle Resource Detection](#idle-resource-detection)
7. [Budget Management](#budget-management)
8. [Cost Anomaly Detection](#cost-anomaly-detection)
9. [FinOps Automation](#finops-automation)
10. [Best Practices](#best-practices)

## Cost Optimization Service

The Cost Optimization Service provides automated cost analysis and recommendations.

### Service Architecture

```
┌─────────────────────────────────────────────────┐
│       Cost Optimization Service                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ Cost         │  │ Rightsizing  │            │
│  │ Analyzer     │  │ Service      │            │
│  └──────────────┘  └──────────────┘            │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ Tagging      │  │ Budget       │            │
│  │ Service      │  │ Service      │            │
│  └──────────────┘  └──────────────┘            │
│                                                  │
└─────────────────────────────────────────────────┘
         │               │               │
         ▼               ▼               ▼
    ┌────────┐     ┌─────────┐     ┌──────┐
    │  AWS   │     │  Azure  │     │ GCP  │
    └────────┘     └─────────┘     └──────┘
```

### API Endpoints

#### Get Current Costs

```bash
curl http://cost-optimization:3000/api/costs/current?provider=aws

Response:
{
  "provider": "aws",
  "total": 8543.21,
  "currency": "USD",
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  }
}
```

#### Get Cost Forecast

```bash
curl http://cost-optimization:3000/api/costs/forecast?provider=aws&days=30

Response:
{
  "provider": "aws",
  "forecast": 9250.00,
  "currency": "USD",
  "period": {
    "start": "2024-02-01",
    "end": "2024-03-01"
  }
}
```

#### Get Cost Breakdown

```bash
curl http://cost-optimization:3000/api/costs/breakdown?provider=aws&groupBy=service

Response:
{
  "provider": "aws",
  "groupBy": "service",
  "breakdown": [
    { "service": "EC2", "cost": 3200.00 },
    { "service": "EKS", "cost": 2100.00 },
    { "service": "RDS", "cost": 1800.00 },
    { "service": "S3", "cost": 900.00 }
  ]
}
```

## Tagging Strategy

### Required Tags

All resources MUST have these tags:

| Tag Key       | Description                      | Example              |
|---------------|----------------------------------|----------------------|
| Environment   | Deployment environment           | production, staging  |
| CostCenter    | Cost allocation                  | engineering, sales   |
| Project       | Project name                     | summit, analytics    |
| Owner         | Team or person responsible       | devops-team          |
| ManagedBy     | How resource is managed          | terraform, manual    |

### Optional Tags

| Tag Key       | Description                      | Example              |
|---------------|----------------------------------|----------------------|
| Application   | Application name                 | api, web-app         |
| Component     | Component within application     | database, cache      |
| Version       | Application version              | v1.2.3               |
| CreatedBy     | Who created the resource         | john.doe             |
| CreatedDate   | When resource was created        | 2024-01-15           |

### Tagging Automation

```bash
# Scan for untagged resources
curl http://cost-optimization:3000/api/tagging/untagged?provider=aws

Response:
{
  "untagged": [
    {
      "resourceId": "i-1234567890abcdef0",
      "resourceType": "EC2",
      "region": "us-east-1"
    }
  ],
  "count": 15
}

# Enforce tagging (dry run)
curl -X POST http://cost-optimization:3000/api/tagging/enforce \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "aws",
    "dryRun": true
  }'

Response:
{
  "success": true,
  "wouldTag": 15,
  "violations": [
    {
      "resourceId": "i-1234567890abcdef0",
      "missingTags": ["Environment", "Owner"]
    }
  ]
}
```

### Terraform Tagging

```hcl
# Default tags in provider configuration
provider "aws" {
  default_tags {
    tags = {
      ManagedBy    = "Terraform"
      Environment  = var.environment
      Project      = "Summit"
      CostCenter   = var.cost_center
      Owner        = var.owner_team
    }
  }
}

# Resource-specific tags
resource "aws_instance" "app" {
  # ... other configuration ...

  tags = {
    Name        = "summit-app-server"
    Application = "api"
    Component   = "backend"
  }
}
```

## Rightsizing

### Get Recommendations

```bash
curl http://cost-optimization:3000/api/rightsizing/recommendations?provider=aws

Response:
{
  "recommendations": [
    {
      "id": "aws-ec2-i-1234567890abcdef0",
      "resourceId": "i-1234567890abcdef0",
      "resourceType": "EC2",
      "currentSize": "t3.xlarge",
      "recommendedSize": "t3.large",
      "estimatedSavings": 150.00,
      "confidence": "high",
      "reason": "Low CPU and memory utilization",
      "metrics": {
        "cpuUtilization": 15.3,
        "memoryUtilization": 28.7
      }
    }
  ],
  "totalSavings": 1250.00
}
```

### Apply Recommendation

```bash
curl -X POST http://cost-optimization:3000/api/rightsizing/apply/aws-ec2-i-1234567890abcdef0

Response:
{
  "success": true,
  "message": "Instance resized from t3.xlarge to t3.large",
  "estimatedMonthlySavings": 150.00
}
```

### Rightsizing Best Practices

1. **Review Weekly**: Check recommendations every week
2. **Test in Staging**: Apply changes to staging first
3. **Monitor Impact**: Watch performance metrics after changes
4. **Schedule Changes**: Resize during maintenance windows
5. **Document Decisions**: Record why recommendations were accepted/rejected

## Reserved Instances and Savings Plans

### Commitment Strategy

| Workload Type       | Recommendation            | Commitment Length |
|---------------------|---------------------------|-------------------|
| Production (24/7)   | Reserved Instances        | 3 years           |
| Production (12/5)   | Savings Plans             | 1 year            |
| Staging             | On-Demand + Spot          | None              |
| Development         | Spot Instances            | None              |

### AWS Reserved Instances

```bash
# Analyze RI utilization
aws ce get-reservation-utilization \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY

# Get RI recommendations
aws ce get-reservation-purchase-recommendation \
  --service "Amazon Elastic Compute Cloud - Compute" \
  --lookback-period-in-days SIXTY_DAYS \
  --payment-option ALL_UPFRONT
```

### Azure Reserved VM Instances

```bash
# Get reservation recommendations
az consumption reservation recommendation list \
  --resource-group summit-production-rg \
  --term P1Y
```

### GCP Committed Use Discounts

```bash
# Get commitment recommendations
gcloud compute commitments describe COMMITMENT_NAME \
  --project=summit-production
```

### Savings Tracking

Target savings from commitments:
- **Goal**: 40% reduction vs on-demand
- **Current**: 35% reduction
- **Annual Savings**: ~$200,000

## Spot Instances

### Spot Instance Strategy

Use spot instances for:
- Batch processing jobs
- CI/CD workloads
- Development environments
- Fault-tolerant applications

### Kubernetes Spot Integration

```yaml
# Node pool with spot instances
apiVersion: v1
kind: Node
metadata:
  labels:
    node.kubernetes.io/lifecycle: spot
spec:
  taints:
  - key: spot
    value: "true"
    effect: NoSchedule
```

```yaml
# Pod tolerating spot nodes
apiVersion: v1
kind: Pod
metadata:
  name: batch-job
spec:
  tolerations:
  - key: spot
    operator: Equal
    value: "true"
    effect: NoSchedule
  nodeSelector:
    node.kubernetes.io/lifecycle: spot
```

### Spot Savings

- **Target**: 20% of compute on spot
- **Average Discount**: 70%
- **Monthly Savings**: ~$15,000

## Idle Resource Detection

### Find Idle Resources

```bash
curl http://cost-optimization:3000/api/idle-resources?provider=aws

Response:
{
  "idle": [
    {
      "resourceId": "vol-1234567890abcdef0",
      "resourceType": "EBS Volume",
      "region": "us-east-1",
      "size": 500,
      "monthlyCost": 50.00,
      "reason": "Unattached for 30+ days"
    },
    {
      "resourceId": "i-0987654321fedcba0",
      "resourceType": "EC2",
      "region": "us-west-2",
      "monthlyCost": 120.00,
      "reason": "CPU utilization < 5% for 7+ days"
    }
  ],
  "totalMonthlyCost": 2340.00
}
```

### Automated Cleanup

Configure automated cleanup policies:

```yaml
# cleanup-policy.yaml
idleResourceCleanup:
  enabled: true
  rules:
    - resourceType: EBS
      condition: unattached
      days: 30
      action: snapshot_and_delete

    - resourceType: EC2
      condition: cpu_utilization < 5
      days: 7
      action: alert_owner

    - resourceType: LoadBalancer
      condition: no_targets
      days: 7
      action: alert_owner

    - resourceType: RDS
      condition: no_connections
      days: 14
      action: snapshot_and_stop
```

## Budget Management

### Create Budget

```bash
curl -X POST http://cost-optimization:3000/api/budgets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summit Production Monthly",
    "amount": 10000,
    "period": "monthly",
    "provider": "aws",
    "alertThresholds": [50, 80, 90, 100],
    "notifications": {
      "email": ["devops@company.com"],
      "slack": "#cost-alerts"
    }
  }'
```

### Budget Alerts

```bash
# Get budget alerts
curl http://cost-optimization:3000/api/budgets/alerts

Response:
{
  "alerts": [
    {
      "budgetName": "Summit Production Monthly",
      "currentSpend": 8543.21,
      "budgetAmount": 10000,
      "percentUsed": 85.4,
      "daysRemaining": 8,
      "projectedSpend": 11200.00,
      "status": "warning"
    }
  ]
}
```

### Budget by Cost Center

| Cost Center     | Monthly Budget | Current Spend | Status        |
|-----------------|----------------|---------------|---------------|
| Engineering     | $6,000         | $5,100        | ✅ On Track   |
| Data Science    | $2,000         | $1,800        | ✅ On Track   |
| DevOps          | $2,000         | $1,643        | ✅ On Track   |
| **Total**       | **$10,000**    | **$8,543**    | **✅ Good**   |

## Cost Anomaly Detection

### Anomaly Detection Rules

```yaml
anomalyDetection:
  enabled: true
  rules:
    - type: daily_spend_spike
      threshold: 1.5x
      baselineDays: 7
      alertSeverity: high

    - type: service_cost_spike
      threshold: 2.0x
      service: any
      baselineDays: 14
      alertSeverity: critical

    - type: unexpected_region
      allowedRegions: [us-east-1, us-west-2]
      alertSeverity: medium
```

### Anomaly Alerts

When anomalies are detected:
1. Alert sent to cost-alerts channel
2. Automatic analysis report generated
3. Recommendation for investigation
4. Optional automatic remediation

## FinOps Automation

### Automated Actions

```yaml
finopsAutomation:
  schedule: "0 */6 * * *"  # Every 6 hours
  actions:
    - name: tag_enforcement
      enabled: true
      dryRun: false

    - name: idle_resource_alerts
      enabled: true
      minIdleDays: 7

    - name: rightsizing_analysis
      enabled: true
      autoApply: false

    - name: spot_opportunity_detection
      enabled: true

    - name: ri_utilization_check
      enabled: true
      minUtilization: 80

    - name: cost_report_generation
      enabled: true
      recipients: [finops-team@company.com]
```

### Daily Cost Report

Automated daily report includes:
- Yesterday's spend by provider
- Month-to-date spend vs budget
- Top 10 cost drivers
- New recommendations
- Anomalies detected

## Best Practices

### 1. Cost Visibility

✅ **Do**:
- Review cost dashboard daily
- Set up budget alerts
- Tag all resources consistently
- Track costs by team/project
- Share cost reports with stakeholders

❌ **Don't**:
- Ignore small cost increases
- Skip tagging "temporary" resources
- Wait for month-end to review costs
- Deploy without cost estimation

### 2. Resource Optimization

✅ **Do**:
- Right-size based on actual usage
- Use autoscaling
- Schedule non-production resources
- Leverage spot instances
- Clean up unused resources

❌ **Don't**:
- Over-provision "just in case"
- Run dev/test 24/7
- Keep unattached volumes
- Ignore rightsizing recommendations

### 3. Commitment Management

✅ **Do**:
- Analyze before committing
- Start with 1-year terms
- Monitor RI utilization
- Review commitments quarterly
- Use savings plans for flexibility

❌ **Don't**:
- Buy 3-year RIs without analysis
- Over-commit on new workloads
- Let RIs sit unused
- Ignore expiring commitments

### 4. Architecture for Cost

✅ **Do**:
- Use serverless where appropriate
- Implement caching
- Optimize data transfer
- Use CDN for static content
- Archive old data to cheap storage

❌ **Don't**:
- Transfer data unnecessarily
- Store everything in hot storage
- Run always-on for batch jobs
- Ignore data transfer costs

### 5. Cultural Practices

✅ **Do**:
- Make cost everyone's responsibility
- Include cost in code reviews
- Celebrate cost optimizations
- Share cost wins
- Train team on cost awareness

❌ **Don't**:
- Make cost only FinOps' problem
- Blame teams for overruns
- Hide cost information
- Ignore developer feedback

## Cost Optimization Checklist

### Weekly
- [ ] Review cost dashboard
- [ ] Check budget alerts
- [ ] Apply rightsizing recommendations
- [ ] Clean up idle resources
- [ ] Verify tagging compliance

### Monthly
- [ ] Review monthly spend report
- [ ] Analyze cost trends
- [ ] Update budget forecasts
- [ ] Review RI utilization
- [ ] Assess spot usage
- [ ] Generate stakeholder reports

### Quarterly
- [ ] Review commitment strategy
- [ ] Evaluate new pricing models
- [ ] Assess architecture for cost
- [ ] Update cost allocation
- [ ] FinOps team retrospective

### Annual
- [ ] Negotiate enterprise agreements
- [ ] Plan commitment renewals
- [ ] Review overall cloud strategy
- [ ] Set next year's budgets
- [ ] Cost optimization training

## Metrics and KPIs

### Cost Efficiency Metrics

| Metric                          | Target  | Current | Status |
|---------------------------------|---------|---------|--------|
| Reserved Instance Coverage      | > 70%   | 68%     | ⚠️     |
| Spot Instance Usage             | > 20%   | 18%     | ⚠️     |
| Idle Resource Cost              | < 5%    | 7%      | ❌     |
| Budget Variance                 | ± 10%   | +5%     | ✅     |
| Cost per Transaction            | < $0.02 | $0.018  | ✅     |
| Tagging Compliance              | > 95%   | 92%     | ⚠️     |

### Optimization ROI

- **Annual Cloud Spend**: $1.2M
- **Cost Optimizations Identified**: $180K/year
- **Implemented Savings**: $120K/year
- **ROI**: 10% reduction in cloud costs

## Support and Resources

### Internal Resources
- **FinOps Team**: finops@company.com
- **Cost Dashboard**: https://grafana.company.com/cost
- **Slack Channel**: #cost-optimization
- **Wiki**: https://wiki.company.com/finops

### External Resources
- [AWS Cost Optimization](https://aws.amazon.com/pricing/cost-optimization/)
- [Azure Cost Management](https://azure.microsoft.com/en-us/products/cost-management/)
- [GCP Cost Optimization](https://cloud.google.com/cost-management)
- [FinOps Foundation](https://www.finops.org/)
