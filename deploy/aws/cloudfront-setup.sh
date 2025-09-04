#!/usr/bin/env bash
# CloudFront Distribution Setup for Zero-Cost Production
# Maximizes AWS Free Tier benefits: 1TB/month free egress + 10M requests

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}☁️ Setting up CloudFront Distribution (1TB/month FREE)${NC}"

# Configuration
export AWS_REGION="${AWS_REGION:-us-east-1}"
export ROOT_DOMAIN="${ROOT_DOMAIN:-intelgraph.io}"
export STAGING_HOST="staging.${ROOT_DOMAIN}"
export PROD_HOST="maestro.${ROOT_DOMAIN}"
export INSTANCE_DNS="${INSTANCE_DNS:-}"

if [[ -z "$INSTANCE_DNS" ]]; then
    echo -e "${RED}❌ INSTANCE_DNS not set. Run the main setup script first.${NC}"
    exit 1
fi

# Create CloudFront distribution configuration
create_cloudfront_config() {
    echo -e "${BLUE}📝 Creating CloudFront distribution configuration...${NC}"
    
    # Request ACM certificate in us-east-1 (required for CloudFront)
    echo -e "${YELLOW}Requesting ACM certificate for ${PROD_HOST} and ${STAGING_HOST}...${NC}"
    
    CERT_ARN=$(aws acm request-certificate \
        --domain-name "$PROD_HOST" \
        --subject-alternative-names "$STAGING_HOST" \
        --validation-method DNS \
        --region us-east-1 \
        --query 'CertificateArn' \
        --output text)
    
    echo -e "${GREEN}✅ Certificate ARN: ${CERT_ARN}${NC}"
    
    # Get validation records
    echo -e "${YELLOW}Getting DNS validation records...${NC}"
    aws acm describe-certificate \
        --certificate-arn "$CERT_ARN" \
        --region us-east-1 \
        --query 'Certificate.DomainValidationOptions[*].ResourceRecord' \
        --output table
    
    echo -e "${YELLOW}⚠️ Manual Step Required:${NC}"
    echo -e "Add the DNS validation records to your domain's DNS settings"
    echo -e "Then run: aws acm wait certificate-validated --certificate-arn ${CERT_ARN} --region us-east-1"
    
    # Create CloudFront distribution JSON
    cat > /tmp/cloudfront-distribution.json <<EOF
{
  "CallerReference": "maestro-$(date +%s)",
  "Aliases": {
    "Quantity": 2,
    "Items": ["${PROD_HOST}", "${STAGING_HOST}"]
  },
  "Comment": "Maestro Conductor - Zero Cost Production (Free Tier)",
  "Enabled": true,
  "PriceClass": "PriceClass_100",
  "DefaultRootObject": "",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "maestro-origin",
        "DomainName": "${INSTANCE_DNS}",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.2"]
          },
          "OriginReadTimeout": 30,
          "OriginKeepaliveTimeout": 5
        },
        "ConnectionAttempts": 3,
        "ConnectionTimeout": 10
      }
    ]
  },
  "OriginGroups": {
    "Quantity": 0
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "maestro-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
    "OriginRequestPolicyId": "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf",
    "ResponseHeadersPolicyId": "67f7725c-6f97-4210-82d7-5512b31e9d03",
    "Compress": true,
    "FunctionAssociations": {
      "Quantity": 0
    }
  },
  "CacheBehaviors": {
    "Quantity": 3,
    "Items": [
      {
        "PathPattern": "/api/*",
        "TargetOriginId": "maestro-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
        "OriginRequestPolicyId": "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf",
        "ResponseHeadersPolicyId": "67f7725c-6f97-4210-82d7-5512b31e9d03",
        "Compress": false
      },
      {
        "PathPattern": "/healthz",
        "TargetOriginId": "maestro-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
        "OriginRequestPolicyId": "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf",
        "Compress": false
      },
      {
        "PathPattern": "/static/*",
        "TargetOriginId": "maestro-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
        "Compress": true
      }
    ]
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "${CERT_ARN}",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2019",
    "CertificateSource": "acm"
  },
  "WebACLId": "",
  "HttpVersion": "http2",
  "IsIPV6Enabled": true,
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      {
        "ErrorCode": 503,
        "ResponsePagePath": "/maintenance.html",
        "ResponseCode": "503",
        "ErrorCachingMinTTL": 300
      },
      {
        "ErrorCode": 502,
        "ResponsePagePath": "/maintenance.html",
        "ResponseCode": "503",
        "ErrorCachingMinTTL": 60
      }
    ]
  },
  "Restrictions": {
    "GeoRestriction": {
      "RestrictionType": "none",
      "Quantity": 0
    }
  },
  "Logging": {
    "Enabled": false,
    "IncludeCookies": false,
    "Bucket": "",
    "Prefix": ""
  }
}
EOF
    
    echo -e "${GREEN}✅ CloudFront configuration created${NC}"
    export CERT_ARN
}

# Create the CloudFront distribution
create_distribution() {
    echo -e "${BLUE}🚀 Creating CloudFront distribution...${NC}"
    
    # Wait for certificate validation (manual step)
    echo -e "${YELLOW}Waiting for certificate validation...${NC}"
    echo -e "Press Enter after you've added the DNS validation records..."
    read -r
    
    # Check certificate status
    if ! aws acm wait certificate-validated --certificate-arn "$CERT_ARN" --region us-east-1 --timeout 300; then
        echo -e "${RED}❌ Certificate validation failed or timed out${NC}"
        echo -e "${YELLOW}You can continue manually after validation completes${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Certificate validated${NC}"
    
    # Create the distribution
    DISTRIBUTION_ID=$(aws cloudfront create-distribution \
        --distribution-config file:///tmp/cloudfront-distribution.json \
        --query 'Distribution.Id' \
        --output text)
    
    if [[ -z "$DISTRIBUTION_ID" ]]; then
        echo -e "${RED}❌ Failed to create CloudFront distribution${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ CloudFront Distribution created: ${DISTRIBUTION_ID}${NC}"
    
    # Get the distribution domain name
    DISTRIBUTION_DOMAIN=$(aws cloudfront get-distribution \
        --id "$DISTRIBUTION_ID" \
        --query 'Distribution.DomainName' \
        --output text)
    
    echo -e "${GREEN}✅ Distribution Domain: ${DISTRIBUTION_DOMAIN}${NC}"
    
    # Save configuration
    cat > cloudfront-config.env <<EOF
# CloudFront Configuration
export DISTRIBUTION_ID=${DISTRIBUTION_ID}
export DISTRIBUTION_DOMAIN=${DISTRIBUTION_DOMAIN}
export CERT_ARN=${CERT_ARN}
export STAGING_HOST=${STAGING_HOST}
export PROD_HOST=${PROD_HOST}
EOF
    
    export DISTRIBUTION_ID DISTRIBUTION_DOMAIN
}

# Create Route 53 DNS records (if using Route 53)
create_dns_records() {
    echo -e "${BLUE}🌐 Setting up DNS records...${NC}"
    
    # Check if domain is hosted in Route 53
    HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
        --dns-name "$ROOT_DOMAIN" \
        --query "HostedZones[?Name=='${ROOT_DOMAIN}.'].Id" \
        --output text | cut -d'/' -f3 2>/dev/null || true)
    
    if [[ -n "$HOSTED_ZONE_ID" ]]; then
        echo -e "${GREEN}Found Route 53 hosted zone: ${HOSTED_ZONE_ID}${NC}"
        
        # Create DNS records for both staging and production
        for HOST in "$STAGING_HOST" "$PROD_HOST"; do
            cat > /tmp/dns-change-batch.json <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${HOST}",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "${DISTRIBUTION_DOMAIN}"
          }
        ]
      }
    }
  ]
}
EOF
            
            CHANGE_ID=$(aws route53 change-resource-record-sets \
                --hosted-zone-id "$HOSTED_ZONE_ID" \
                --change-batch file:///tmp/dns-change-batch.json \
                --query 'ChangeInfo.Id' \
                --output text)
            
            echo -e "${GREEN}✅ DNS record created for ${HOST}: ${CHANGE_ID}${NC}"
        done
        
        echo -e "${YELLOW}Waiting for DNS propagation...${NC}"
        sleep 30
        
    else
        echo -e "${YELLOW}⚠️ Domain not found in Route 53${NC}"
        echo -e "${BLUE}Manual DNS setup required:${NC}"
        echo -e "Add CNAME records:"
        echo -e "  ${STAGING_HOST} → ${DISTRIBUTION_DOMAIN}"
        echo -e "  ${PROD_HOST} → ${DISTRIBUTION_DOMAIN}"
    fi
}

# Create WAF rules for additional security (free tier)
setup_waf_protection() {
    echo -e "${BLUE}🛡️ Setting up WAF protection (free requests included)...${NC}"
    
    # Create WAF Web ACL
    cat > /tmp/waf-web-acl.json <<EOF
{
  "Name": "MaestroProtection",
  "Scope": "CLOUDFRONT",
  "DefaultAction": {
    "Allow": {}
  },
  "Rules": [
    {
      "Name": "RateLimitRule",
      "Priority": 1,
      "Statement": {
        "RateBasedStatement": {
          "Limit": 2000,
          "AggregateKeyType": "IP"
        }
      },
      "Action": {
        "Block": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "RateLimitRule"
      }
    },
    {
      "Name": "CommonAttackProtection",
      "Priority": 2,
      "OverrideAction": {
        "None": {}
      },
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "CommonAttackProtection"
      }
    }
  ],
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "MaestroProtection"
  }
}
EOF
    
    # Create the Web ACL
    WEB_ACL_ARN=$(aws wafv2 create-web-acl \
        --scope CLOUDFRONT \
        --cli-input-json file:///tmp/waf-web-acl.json \
        --region us-east-1 \
        --query 'Summary.ARN' \
        --output text)
    
    if [[ -n "$WEB_ACL_ARN" ]]; then
        echo -e "${GREEN}✅ WAF Web ACL created: ${WEB_ACL_ARN}${NC}"
        
        # Associate with CloudFront distribution
        aws cloudfront update-distribution \
            --id "$DISTRIBUTION_ID" \
            --distribution-config "$(aws cloudfront get-distribution-config \
                --id "$DISTRIBUTION_ID" \
                --query 'DistributionConfig' \
                --output json | jq '.WebACLId = "'$WEB_ACL_ARN'"')" \
            --if-match "$(aws cloudfront get-distribution \
                --id "$DISTRIBUTION_ID" \
                --query 'ETag' \
                --output text)" > /dev/null
        
        echo -e "${GREEN}✅ WAF associated with CloudFront distribution${NC}"
    else
        echo -e "${YELLOW}⚠️ WAF setup skipped (optional)${NC}"
    fi
}

# Monitor and optimize costs
setup_cost_monitoring() {
    echo -e "${BLUE}💰 Setting up cost monitoring and alerts...${NC}"
    
    # Create CloudWatch alarm for estimated charges
    aws cloudwatch put-metric-alarm \
        --alarm-name "MaestroEstimatedCharges" \
        --alarm-description "Alert when estimated charges exceed $5" \
        --metric-name EstimatedCharges \
        --namespace AWS/Billing \
        --statistic Maximum \
        --period 86400 \
        --threshold 5.0 \
        --comparison-operator GreaterThanThreshold \
        --dimensions Name=Currency,Value=USD \
        --evaluation-periods 1 \
        --alarm-actions "arn:aws:sns:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):billing-alerts" \
        --region us-east-1 || echo "Billing alerts require manual SNS topic setup"
    
    # Create dashboard for monitoring
    cat > /tmp/cloudwatch-dashboard.json <<EOF
{
  "widgets": [
    {
      "type": "metric",
      "x": 0,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/CloudFront", "Requests", "DistributionId", "${DISTRIBUTION_ID}"],
          [".", "BytesDownloaded", ".", "."],
          [".", "4xxErrorRate", ".", "."],
          [".", "5xxErrorRate", ".", "."]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "CloudFront Metrics"
      }
    },
    {
      "type": "metric",
      "x": 0,
      "y": 6,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/EC2", "CPUUtilization", "InstanceId", "$(aws ec2 describe-instances --filters 'Name=tag:Name,Values=maestro-conductor' --query 'Reservations[0].Instances[0].InstanceId' --output text)"],
          [".", "NetworkIn", ".", "."],
          [".", "NetworkOut", ".", "."]
        ],
        "period": 300,
        "stat": "Average",
        "region": "${AWS_REGION}",
        "title": "EC2 Instance Metrics"
      }
    }
  ]
}
EOF
    
    aws cloudwatch put-dashboard \
        --dashboard-name "MaestroConductor" \
        --dashboard-body file:///tmp/cloudwatch-dashboard.json \
        --region "$AWS_REGION"
    
    echo -e "${GREEN}✅ Cost monitoring and dashboard created${NC}"
}

# Test the setup
test_cloudfront_setup() {
    echo -e "${BLUE}🧪 Testing CloudFront setup...${NC}"
    
    echo -e "${YELLOW}Waiting for CloudFront distribution to deploy...${NC}"
    aws cloudfront wait distribution-deployed --id "$DISTRIBUTION_ID"
    
    echo -e "${GREEN}✅ CloudFront distribution deployed${NC}"
    
    # Test endpoints
    for HOST in "$STAGING_HOST" "$PROD_HOST"; do
        echo -e "${YELLOW}Testing ${HOST}...${NC}"
        
        if curl -s -o /dev/null -w "%{http_code}" "https://${HOST}/healthz" | grep -q "200\|404"; then
            echo -e "${GREEN}✅ ${HOST} responding${NC}"
        else
            echo -e "${YELLOW}⚠️ ${HOST} not yet responding (DNS propagation may take time)${NC}"
        fi
    done
    
    echo -e "${BLUE}🎯 CloudFront URLs:${NC}"
    echo -e "${GREEN}Staging: https://${STAGING_HOST}${NC}"
    echo -e "${GREEN}Production: https://${PROD_HOST}${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}☁️ CloudFront Zero-Cost Production Setup${NC}"
    echo -e "${GREEN}Benefits: 1TB/month free egress + 10M requests + global CDN${NC}"
    
    create_cloudfront_config
    create_distribution
    create_dns_records
    setup_waf_protection
    setup_cost_monitoring
    test_cloudfront_setup
    
    # Final summary
    echo -e "\n${GREEN}🎉 CloudFront Setup Complete!${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Distribution ID: ${DISTRIBUTION_ID}${NC}"
    echo -e "${GREEN}✅ Domain: ${DISTRIBUTION_DOMAIN}${NC}"
    echo -e "${GREEN}✅ Staging: https://${STAGING_HOST}${NC}"
    echo -e "${GREEN}✅ Production: https://${PROD_HOST}${NC}"
    echo -e "${GREEN}✅ Free Tier: 1TB egress + 10M requests/month${NC}"
    echo -e "${GREEN}✅ Security: WAF + TLS 1.2+ + Rate limiting${NC}"
    echo -e "${GREEN}✅ Monitoring: CloudWatch dashboard + billing alerts${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    
    echo -e "${YELLOW}Configuration saved to: cloudfront-config.env${NC}"
    echo -e "${BLUE}Source it with: source cloudfront-config.env${NC}"
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi