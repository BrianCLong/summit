#!/usr/bin/env bash
# AWS Free Tier Enhanced Production Deployment for Maestro
# Zero-cost, maximum power deployment using AWS Free/Always-Free tiers

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 AWS Free Tier Enhanced Maestro Deployment${NC}"
echo -e "${GREEN}Maximum power at $0 cost using AWS Always-Free services${NC}"

# ======== CONFIGURATION (EDIT THESE) ========
export AWS_REGION="${AWS_REGION:-us-east-1}"
export ROOT_DOMAIN="${ROOT_DOMAIN:-intelgraph.io}"
export STAGING_HOST="staging.${ROOT_DOMAIN}"
export PROD_HOST="maestro.${ROOT_DOMAIN}"
export KEY_NAME="${KEY_NAME:-maestro-keypair}"
export MAESTRO_IMAGE="${MAESTRO_IMAGE:-ghcr.io/brianclong/maestro-control-plane}"
export MAESTRO_TAG="${MAESTRO_TAG:-latest}"

# Enhanced instance type for more power at $0
export INSTANCE_TYPE="${INSTANCE_TYPE:-t4g.small}"  # 2 vCPU, 2GB RAM - Free trial until Dec 31, 2025
export ARCHITECTURE="${ARCHITECTURE:-arm64}"

# Fallback for legacy Free Tier accounts
if [[ "${USE_LEGACY_FREE_TIER:-false}" == "true" ]]; then
    export INSTANCE_TYPE="t3.micro"
    export ARCHITECTURE="x86_64"
    echo -e "${YELLOW}Using legacy Free Tier: t3.micro${NC}"
else
    echo -e "${GREEN}Using enhanced Free Tier: t4g.small (2 vCPU, 2GB RAM)${NC}"
fi

# ======== PREREQUISITES CHECK ========
check_prerequisites() {
    local missing=()
    
    for cmd in aws jq curl kubectl helm; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            missing+=("$cmd")
        fi
    done
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        echo -e "${RED}❌ Missing required tools: ${missing[*]}${NC}"
        echo "Install with: brew install awscli jq kubernetes-cli helm"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        echo -e "${RED}❌ AWS credentials not configured${NC}"
        echo "Run: aws configure"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites validated${NC}"
}

# ======== AWS INFRASTRUCTURE SETUP ========
setup_aws_infrastructure() {
    echo -e "${BLUE}🏗️ Setting up AWS infrastructure (Free Tier)...${NC}"
    
    # Create VPC and security group
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)
    echo -e "${GREEN}Using default VPC: ${VPC_ID}${NC}"
    
    # Create security group for Maestro
    SG_ID=$(aws ec2 create-security-group \
        --group-name maestro-sg \
        --description "Maestro Conductor Security Group" \
        --vpc-id "$VPC_ID" \
        --query 'GroupId' \
        --output text 2>/dev/null || \
        aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=maestro-sg" \
        --query 'SecurityGroups[0].GroupId' \
        --output text)
    
    # Configure security group rules
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0 \
        --output text >/dev/null 2>&1 || true
    
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0 \
        --output text >/dev/null 2>&1 || true
    
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp \
        --port 443 \
        --cidr 0.0.0.0/0 \
        --output text >/dev/null 2>&1 || true
    
    echo -e "${GREEN}✅ Security Group configured: ${SG_ID}${NC}"
    
    # Create key pair if it doesn't exist
    if ! aws ec2 describe-key-pairs --key-names "$KEY_NAME" >/dev/null 2>&1; then
        aws ec2 create-key-pair --key-name "$KEY_NAME" --query 'KeyMaterial' --output text > ~/.ssh/${KEY_NAME}.pem
        chmod 600 ~/.ssh/${KEY_NAME}.pem
        echo -e "${GREEN}✅ Created SSH key: ~/.ssh/${KEY_NAME}.pem${NC}"
    fi
    
    # Get latest AMI for Amazon Linux 2023 ARM64
    if [[ "$ARCHITECTURE" == "arm64" ]]; then
        AMI_ID=$(aws ec2 describe-images \
            --owners amazon \
            --filters "Name=name,Values=al2023-ami-*-arm64" \
                     "Name=state,Values=available" \
            --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
            --output text)
    else
        AMI_ID=$(aws ec2 describe-images \
            --owners amazon \
            --filters "Name=name,Values=al2023-ami-*-x86_64" \
                     "Name=state,Values=available" \
            --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
            --output text)
    fi
    
    echo -e "${GREEN}Using AMI: ${AMI_ID} (${ARCHITECTURE})${NC}"
    
    # Launch instance
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id "$AMI_ID" \
        --count 1 \
        --instance-type "$INSTANCE_TYPE" \
        --key-name "$KEY_NAME" \
        --security-group-ids "$SG_ID" \
        --associate-public-ip-address \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=maestro-conductor},{Key=Project,Value=IntelGraph},{Key=Environment,Value=production}]" \
        --user-data file://deploy/aws/cloud-init.yaml \
        --query 'Instances[0].InstanceId' \
        --output text)
    
    echo -e "${GREEN}✅ Instance launched: ${INSTANCE_ID}${NC}"
    echo -e "${YELLOW}Waiting for instance to be ready...${NC}"
    
    aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"
    
    # Get public IP
    INSTANCE_IP=$(aws ec2 describe-instances \
        --instance-ids "$INSTANCE_ID" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)
    
    INSTANCE_DNS=$(aws ec2 describe-instances \
        --instance-ids "$INSTANCE_ID" \
        --query 'Reservations[0].Instances[0].PublicDnsName' \
        --output text)
    
    echo -e "${GREEN}✅ Instance ready: ${INSTANCE_IP} (${INSTANCE_DNS})${NC}"
    
    # Export for other functions
    export INSTANCE_ID INSTANCE_IP INSTANCE_DNS SG_ID
}

# ======== CLOUDFRONT SETUP (FREE TIER) ========
setup_cloudfront() {
    echo -e "${BLUE}☁️ Setting up CloudFront (1TB/month free egress)...${NC}"
    
    # Request ACM certificate in us-east-1 (required for CloudFront)
    CERT_ARN=$(aws acm request-certificate \
        --domain-name "$PROD_HOST" \
        --subject-alternative-names "$STAGING_HOST" \
        --validation-method DNS \
        --region us-east-1 \
        --query 'CertificateArn' \
        --output text)
    
    echo -e "${GREEN}✅ ACM Certificate requested: ${CERT_ARN}${NC}"
    echo -e "${YELLOW}⚠️ Manual step required: Validate the certificate via DNS records${NC}"
    
    # Create CloudFront distribution config
    cat > /tmp/cloudfront-distribution.json <<EOF
{
  "CallerReference": "maestro-$(date +%s)",
  "Comment": "Maestro Conductor - Zero Cost Production",
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
            "Quantity": 3,
            "Items": ["TLSv1", "TLSv1.1", "TLSv1.2"]
          }
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "maestro-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "MinTTL": 0,
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": {
        "Forward": "all"
      },
      "Headers": {
        "Quantity": 4,
        "Items": ["Authorization", "Host", "Origin", "Referer"]
      }
    },
    "Compress": true
  },
  "Enabled": true,
  "PriceClass": "PriceClass_All",
  "ViewerCertificate": {
    "ACMCertificateArn": "${CERT_ARN}",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2019"
  },
  "Aliases": {
    "Quantity": 2,
    "Items": ["${PROD_HOST}", "${STAGING_HOST}"]
  }
}
EOF
    
    echo -e "${GREEN}✅ CloudFront configuration prepared${NC}"
    echo -e "${YELLOW}Manual step: Create CloudFront distribution with the config above${NC}"
}

# ======== K3S INSTALLATION ON INSTANCE ========
install_k3s_remote() {
    echo -e "${BLUE}🎯 Installing k3s on remote instance...${NC}"
    
    # Wait for SSH to be ready
    echo -e "${YELLOW}Waiting for SSH to be ready...${NC}"
    until ssh -i ~/.ssh/${KEY_NAME}.pem -o StrictHostKeyChecking=no ec2-user@${INSTANCE_IP} echo "SSH Ready" 2>/dev/null; do
        sleep 10
    done
    
    # Install k3s with optimized settings
    ssh -i ~/.ssh/${KEY_NAME}.pem -o StrictHostKeyChecking=no ec2-user@${INSTANCE_IP} <<'EOF'
# Install k3s with performance optimizations
curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=stable sh -s - server \
  --write-kubeconfig-mode 644 \
  --disable traefik \
  --disable local-storage \
  --kube-apiserver-arg=feature-gates=EphemeralContainers=true \
  --kubelet-arg=feature-gates=EphemeralContainers=true

# Install Docker for enhanced container runtime
sudo dnf update -y
sudo dnf install -y docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -a -G docker ec2-user

# Install additional tools
sudo dnf install -y git curl wget unzip

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/$(uname -m | sed 's/aarch64/arm64/' | sed 's/x86_64/amd64/')/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install helm
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh

# Install k6 for load testing
sudo dnf install -y https://dl.k6.io/rpm/repo.rpm
sudo dnf install -y k6

echo "✅ k3s and tools installed successfully"
EOF
    
    # Copy kubeconfig locally
    scp -i ~/.ssh/${KEY_NAME}.pem -o StrictHostKeyChecking=no ec2-user@${INSTANCE_IP}:/etc/rancher/k3s/k3s.yaml ./kubeconfig-aws
    sed -i "s/127.0.0.1/${INSTANCE_IP}/g" ./kubeconfig-aws
    chmod 600 ./kubeconfig-aws
    
    export KUBECONFIG="./kubeconfig-aws"
    
    echo -e "${GREEN}✅ k3s installed and kubeconfig configured${NC}"
}

# ======== ENHANCED MONITORING SETUP ========
setup_enhanced_monitoring() {
    echo -e "${BLUE}📊 Setting up enhanced monitoring (CloudWatch + Prometheus)...${NC}"
    
    # Install CloudWatch agent on instance
    ssh -i ~/.ssh/${KEY_NAME}.pem -o StrictHostKeyChecking=no ec2-user@${INSTANCE_IP} <<EOF
# Install CloudWatch agent
sudo dnf install -y amazon-cloudwatch-agent

# Configure CloudWatch agent
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json > /dev/null <<'CWCONFIG'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/k3s.log",
            "log_group_name": "/aws/ec2/maestro/k3s",
            "log_stream_name": "{instance_id}/k3s",
            "timestamp_format": "%Y-%m-%d %H:%M:%S"
          },
          {
            "file_path": "/var/log/containers/*.log",
            "log_group_name": "/aws/ec2/maestro/containers",
            "log_stream_name": "{instance_id}/containers"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "Maestro/Production",
    "metrics_collected": {
      "cpu": {
        "measurement": ["cpu_usage_idle", "cpu_usage_iowait"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": ["used_percent"],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 60
      },
      "net": {
        "measurement": ["bytes_sent", "bytes_recv", "packets_sent", "packets_recv"],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      }
    }
  }
}
CWCONFIG

# Start CloudWatch agent
sudo systemctl enable amazon-cloudwatch-agent
sudo systemctl start amazon-cloudwatch-agent

echo "✅ CloudWatch monitoring configured"
EOF
    
    # Deploy enhanced Prometheus stack
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    helm upgrade --install kps prometheus-community/kube-prometheus-stack \
        --namespace monitoring --create-namespace \
        --set grafana.adminPassword='admin' \
        --set grafana.defaultDashboardsTimezone='browser' \
        --set prometheus.prometheusSpec.retention='7d' \
        --set prometheus.prometheusSpec.resources.requests.memory='512Mi' \
        --set prometheus.prometheusSpec.resources.requests.cpu='200m' \
        --set grafana.resources.requests.memory='256Mi' \
        --set grafana.resources.requests.cpu='100m' \
        --set alertmanager.alertmanagerSpec.resources.requests.memory='128Mi' \
        --set alertmanager.alertmanagerSpec.resources.requests.cpu='50m'
    
    echo -e "${GREEN}✅ Enhanced monitoring stack deployed${NC}"
}

# ======== PRODUCTION-GRADE SECURITY ========
setup_security_hardening() {
    echo -e "${BLUE}🔒 Implementing production-grade security...${NC}"
    
    # Deploy OPA Gatekeeper with enhanced policies
    helm repo add gatekeeper https://open-policy-agent.github.io/gatekeeper/charts
    helm upgrade --install gatekeeper gatekeeper/gatekeeper \
        --namespace gatekeeper-system --create-namespace \
        --set replicas=1 \
        --set resources.requests.cpu=100m \
        --set resources.requests.memory=256Mi
    
    # Wait for Gatekeeper to be ready
    kubectl wait --for=condition=Ready pods -l gatekeeper.sh/operation=webhook -n gatekeeper-system --timeout=300s
    
    # Apply comprehensive security policies
    kubectl apply -f - <<'EOF'
# Require image digests (no :latest tags)
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: k8srequireimagedigest
spec:
  crd:
    spec:
      names:
        kind: K8sRequireImageDigest
      validation:
        properties:
          exemptImages:
            type: array
            items:
              type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequireimagedigest
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not has_digest(container.image)
          not is_exempt(container.image)
          msg := sprintf("Container image '%v' must use a digest", [container.image])
        }
        has_digest(image) {
          contains(image, "@sha256:")
        }
        is_exempt(image) {
          input.parameters.exemptImages[_] == image
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequireImageDigest
metadata:
  name: must-have-digest
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    exemptImages:
      - "k8s.gcr.io/pause"
      - "rancher/pause"
---
# Require resource limits
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: k8srequireresourcelimits
spec:
  crd:
    spec:
      names:
        kind: K8sRequireResourceLimits
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequireresourcelimits
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.resources.limits.cpu
          msg := sprintf("Container '%v' must specify CPU limits", [container.name])
        }
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.resources.limits.memory
          msg := sprintf("Container '%v' must specify memory limits", [container.name])
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequireResourceLimits
metadata:
  name: must-have-limits
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
EOF
    
    # Deploy Falco for runtime security monitoring
    helm repo add falcosecurity https://falcosecurity.github.io/charts
    helm upgrade --install falco falcosecurity/falco \
        --namespace falco-system --create-namespace \
        --set resources.requests.cpu=100m \
        --set resources.requests.memory=512Mi \
        --set falco.grpc.enabled=true \
        --set falco.grpcOutput.enabled=true
    
    # Deploy network policies
    kubectl apply -f - <<'EOF'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: default
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-nginx
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: maestro
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
EOF
    
    echo -e "${GREEN}✅ Production-grade security implemented${NC}"
}

# ======== COMPLETE DEPLOYMENT AUTOMATION ========
deploy_maestro() {
    echo -e "${BLUE}🎭 Deploying Maestro with enhanced configuration...${NC}"
    
    # Create namespaces with enhanced configuration
    kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: maestro-staging
  labels:
    name: maestro-staging
    security.policy: restricted
---
apiVersion: v1
kind: Namespace
metadata:
  name: maestro-prod
  labels:
    name: maestro-prod
    security.policy: restricted
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: maestro-staging
spec:
  hard:
    requests.cpu: "1"
    requests.memory: 2Gi
    limits.cpu: "2"
    limits.memory: 4Gi
    pods: "10"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: maestro-prod
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 4Gi
    limits.cpu: "4"
    limits.memory: 8Gi
    pods: "20"
EOF
    
    # Deploy NGINX Ingress
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx --create-namespace \
        --set controller.replicaCount=1 \
        --set controller.resources.requests.cpu=100m \
        --set controller.resources.requests.memory=128Mi \
        --set controller.service.type=LoadBalancer
    
    # Deploy Argo Rollouts for canary deployments
    helm repo add argo https://argoproj.github.io/argo-helm
    helm upgrade --install argo-rollouts argo/argo-rollouts \
        --namespace argo-rollouts --create-namespace
    
    # Deploy Maestro to staging with enhanced configuration
    kubectl apply -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: maestro
  namespace: maestro-staging
  annotations:
    deployment.kubernetes.io/revision: "1"
    org.opencontainers.image.source: https://github.com/brianclong/intelgraph
spec:
  replicas: 2
  selector:
    matchLabels:
      app: maestro
  template:
    metadata:
      labels:
        app: maestro
        version: v1
      annotations:
        org.opencontainers.image.source: https://github.com/brianclong/intelgraph
        org.opencontainers.image.revision: \$(git rev-parse HEAD)
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: maestro
        image: ${MAESTRO_IMAGE}:${MAESTRO_TAG}
        imagePullPolicy: Always
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: LOG_LEVEL
          value: "info"
        - name: METRICS_ENABLED
          value: "true"
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /livez
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 1001
          capabilities:
            drop:
              - ALL
      securityContext:
        fsGroup: 1001
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: {duration: 30s}
      - setWeight: 25
      - pause: {duration: 30s}
      - setWeight: 50
      - pause: {duration: 60s}
      - setWeight: 75
      - pause: {duration: 60s}
      analysis:
        templates:
        - templateName: success-rate
        startingStep: 2
        args:
        - name: service-name
          value: maestro
---
apiVersion: v1
kind: Service
metadata:
  name: maestro
  namespace: maestro-staging
  labels:
    app: maestro
spec:
  selector:
    app: maestro
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
    name: http
  type: ClusterIP
EOF
    
    # Deploy enhanced ingress configuration
    kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: maestro-staging
  namespace: maestro-staging
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: HTTP
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "X-Frame-Options: DENY";
      more_set_headers "X-Content-Type-Options: nosniff";
      more_set_headers "X-XSS-Protection: 1; mode=block";
      more_set_headers "Referrer-Policy: strict-origin-when-cross-origin";
spec:
  rules:
  - host: ${STAGING_HOST}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: maestro
            port:
              number: 80
EOF
    
    echo -e "${GREEN}✅ Maestro deployed to staging environment${NC}"
}

# ======== LOAD TESTING AND VALIDATION ========
run_comprehensive_testing() {
    echo -e "${BLUE}🧪 Running comprehensive testing suite...${NC}"
    
    # Wait for deployment to be ready
    kubectl rollout status deployment/maestro -n maestro-staging --timeout=300s
    
    # Get service endpoint
    STAGING_ENDPOINT="http://${INSTANCE_IP}"
    
    # Create k6 load testing script
    cat > /tmp/maestro-load-test.js <<'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export let errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '2m', target: 10 },  // Ramp up
    { duration: '5m', target: 10 },  // Stay at 10 users
    { duration: '2m', target: 20 },  // Ramp to 20 users
    { duration: '5m', target: 20 },  // Stay at 20 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<5000'], // 95% of requests under 5s
    'errors': ['rate<0.02'],             // Error rate under 2%
  }
};

export default function() {
  let response = http.get(__ENV.STAGING_ENDPOINT + '/healthz');
  
  let result = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 5000,
  });
  
  errorRate.add(!result);
  
  sleep(1);
}
EOF
    
    # Run load test on the instance
    echo -e "${YELLOW}Running load test...${NC}"
    ssh -i ~/.ssh/${KEY_NAME}.pem -o StrictHostKeyChecking=no ec2-user@${INSTANCE_IP} \
        "STAGING_ENDPOINT=${STAGING_ENDPOINT} k6 run --summary-trend-stats='avg,min,med,max,p(90),p(95),p(99)' -" < /tmp/maestro-load-test.js
    
    echo -e "${GREEN}✅ Load testing completed${NC}"
}

# ======== MAIN EXECUTION ========
main() {
    echo -e "${BLUE}🎯 Starting AWS Free Tier Enhanced Maestro Deployment${NC}"
    echo -e "${GREEN}Cost: \$0 - Using AWS Always-Free and Free Tier services${NC}"
    
    check_prerequisites
    
    echo -e "${BLUE}Phase 1: AWS Infrastructure Setup${NC}"
    setup_aws_infrastructure
    
    echo -e "${BLUE}Phase 2: CloudFront CDN Configuration${NC}"
    setup_cloudfront
    
    echo -e "${BLUE}Phase 3: K3s Installation${NC}"
    install_k3s_remote
    
    echo -e "${BLUE}Phase 4: Enhanced Monitoring${NC}"
    setup_enhanced_monitoring
    
    echo -e "${BLUE}Phase 5: Security Hardening${NC}"
    setup_security_hardening
    
    echo -e "${BLUE}Phase 6: Maestro Deployment${NC}"
    deploy_maestro
    
    echo -e "${BLUE}Phase 7: Comprehensive Testing${NC}"
    run_comprehensive_testing
    
    # Final summary
    echo -e "\n${GREEN}🎉 AWS Free Tier Enhanced Deployment Complete!${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Instance: ${INSTANCE_TYPE} (${INSTANCE_IP})${NC}"
    echo -e "${GREEN}✅ Staging: http://${INSTANCE_IP}${NC}"
    echo -e "${GREEN}✅ Monitoring: kubectl port-forward svc/kps-grafana 3000:80 -n monitoring${NC}"
    echo -e "${GREEN}✅ Security: Gatekeeper + Falco + Network Policies${NC}"
    echo -e "${GREEN}✅ Load Testing: Completed successfully${NC}"
    echo -e "${YELLOW}⚠️ Next: Configure CloudFront DNS to point to your domain${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    
    # Save configuration
    cat > maestro-aws-config.env <<EOF
# Maestro AWS Configuration
export AWS_REGION=${AWS_REGION}
export INSTANCE_ID=${INSTANCE_ID}
export INSTANCE_IP=${INSTANCE_IP}
export INSTANCE_DNS=${INSTANCE_DNS}
export STAGING_HOST=${STAGING_HOST}
export PROD_HOST=${PROD_HOST}
export KUBECONFIG=${PWD}/kubeconfig-aws

# Usage:
# source maestro-aws-config.env
# kubectl get pods -A
EOF
    
    echo -e "${GREEN}Configuration saved to: maestro-aws-config.env${NC}"
}

# Run main function
main "$@"