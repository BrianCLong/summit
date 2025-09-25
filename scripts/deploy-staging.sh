#!/usr/bin/env bash
set -euo pipefail

# IntelGraph Staging Environment Deployment Script
# Automated staging deployment with comprehensive validation

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly ENVIRONMENT="staging"
readonly NAMESPACE="intelgraph-staging"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Error handling
trap 'log_error "Deployment failed at line $LINENO. Exit code: $?"' ERR

main() {
    log_info "🚀 Starting IntelGraph staging deployment..."

    validate_prerequisites
    setup_terraform_backend
    deploy_infrastructure
    deploy_applications
    run_health_checks
    setup_monitoring

    log_success "✅ Staging environment deployment completed successfully!"
    log_info "🔗 Access URLs:"
    log_info "  - API: https://api-staging.intelgraph.ai"
    log_info "  - UI: https://staging.intelgraph.ai"
    log_info "  - Grafana: https://grafana-staging.intelgraph.ai"
    log_info "  - Jaeger: https://jaeger-staging.intelgraph.ai"
}

validate_prerequisites() {
    log_info "🔍 Validating prerequisites..."

    # Check required tools
    local tools=("terraform" "kubectl" "helm" "docker")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is required but not installed"
            exit 1
        fi
    done

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi

    # Validate environment variables
    local required_vars=("AWS_REGION" "GITHUB_TOKEN")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_warning "$var not set - using defaults"
        fi
    done

    log_success "Prerequisites validated"
}

setup_terraform_backend() {
    log_info "🏗️  Setting up Terraform backend..."

    local backend_bucket="intelgraph-terraform-state"
    local backend_region="${AWS_REGION:-us-west-2}"
    local backend_table="intelgraph-terraform-locks"

    # Create S3 bucket for state if it doesn't exist
    if ! aws s3 ls "s3://$backend_bucket" &> /dev/null; then
        log_info "Creating Terraform state bucket: $backend_bucket"
        aws s3 mb "s3://$backend_bucket" --region "$backend_region"

        # Enable versioning and encryption
        aws s3api put-bucket-versioning \
            --bucket "$backend_bucket" \
            --versioning-configuration Status=Enabled

        aws s3api put-bucket-encryption \
            --bucket "$backend_bucket" \
            --server-side-encryption-configuration '{
                "Rules": [{
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }]
            }'
    fi

    # Create DynamoDB table for locking if it doesn't exist
    if ! aws dynamodb describe-table --table-name "$backend_table" &> /dev/null; then
        log_info "Creating Terraform lock table: $backend_table"
        aws dynamodb create-table \
            --table-name "$backend_table" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5

        # Wait for table to be active
        aws dynamodb wait table-exists --table-name "$backend_table"
    fi

    log_success "Terraform backend configured"
}

deploy_infrastructure() {
    log_info "🏗️  Deploying infrastructure with Terraform..."

    cd "$PROJECT_ROOT/infra/terraform/aws"

    # Initialize Terraform
    terraform init -input=false -reconfigure

    # Create staging workspace
    terraform workspace select staging || terraform workspace new staging

    # Validate configuration
    terraform validate

    # Plan deployment
    log_info "Planning infrastructure changes..."
    terraform plan \
        -var="environment=staging" \
        -var="project_name=intelgraph" \
        -var="owner=$(git config user.name || echo 'IntelGraph Team')" \
        -out=staging.tfplan

    # Apply changes
    log_info "Applying infrastructure changes..."
    terraform apply -auto-approve staging.tfplan

    # Extract outputs
    local eks_cluster_name
    eks_cluster_name=$(terraform output -raw cluster_name)
    local postgres_endpoint
    postgres_endpoint=$(terraform output -raw rds_cluster_endpoint)
    local redis_endpoint
    redis_endpoint=$(terraform output -raw redis_primary_endpoint)

    # Update kubeconfig
    log_info "Updating kubeconfig for EKS cluster: $eks_cluster_name"
    aws eks update-kubeconfig --region "${AWS_REGION:-us-west-2}" --name "$eks_cluster_name"

    # Store outputs for application deployment
    cat > "$PROJECT_ROOT/.env.staging" << EOF
# Generated staging environment configuration
ENVIRONMENT=staging
EKS_CLUSTER_NAME=$eks_cluster_name
POSTGRES_ENDPOINT=$postgres_endpoint
REDIS_ENDPOINT=$redis_endpoint
NAMESPACE=$NAMESPACE
EOF

    cd "$PROJECT_ROOT"
    log_success "Infrastructure deployed successfully"
}

deploy_applications() {
    log_info "🚀 Deploying applications to Kubernetes..."

    # Create namespace
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

    # Label namespace for monitoring
    kubectl label namespace "$NAMESPACE" environment=staging --overwrite

    # Deploy core applications using Helm
    local charts=("monitoring" "intelgraph" "gateway")

    for chart in "${charts[@]}"; do
        log_info "Deploying $chart..."

        if [[ -d "$PROJECT_ROOT/charts/$chart" ]]; then
            helm upgrade --install "$chart" "$PROJECT_ROOT/charts/$chart" \
                --namespace "$NAMESPACE" \
                --values "$PROJECT_ROOT/charts/$chart/values-staging.yaml" \
                --set image.tag="${GITHUB_SHA:-latest}" \
                --set environment=staging \
                --wait \
                --timeout=600s
        else
            log_warning "Chart $chart not found, skipping"
        fi
    done

    log_success "Applications deployed"
}

run_health_checks() {
    log_info "🏥 Running comprehensive health checks..."

    # Wait for deployments to be ready
    log_info "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available deployment --all -n "$NAMESPACE" --timeout=600s

    # Check pod status
    log_info "Checking pod status..."
    kubectl get pods -n "$NAMESPACE" -o wide

    # Health check endpoints
    local endpoints=(
        "http://intelgraph-server.$NAMESPACE.svc.cluster.local:8080/healthz"
        "http://intelgraph-client.$NAMESPACE.svc.cluster.local:3000"
        "http://prometheus.$NAMESPACE.svc.cluster.local:9090/-/healthy"
        "http://grafana.$NAMESPACE.svc.cluster.local:3000/api/health"
    )

    # Run health checks from within cluster
    for endpoint in "${endpoints[@]}"; do
        log_info "Testing $endpoint..."
        kubectl run health-check-$(date +%s) \
            --image=curlimages/curl \
            --rm -i --restart=Never \
            --namespace="$NAMESPACE" \
            -- curl -f "$endpoint" --max-time 30 || log_warning "Health check failed for $endpoint"
    done

    log_success "Health checks completed"
}

setup_monitoring() {
    log_info "📊 Setting up monitoring and alerting..."

    # Configure Prometheus targets
    kubectl apply -f - << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-staging-config
  namespace: $NAMESPACE
data:
  prometheus.yml: |
    global:
      scrape_interval: 30s
      evaluation_interval: 30s

    rule_files:
      - "/etc/prometheus/rules/*.yml"

    scrape_configs:
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names: [$NAMESPACE]
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
            action: replace
            target_label: __metrics_path__
            regex: (.+)
EOF

    # Create Grafana dashboards
    if kubectl get configmap grafana-dashboards -n "$NAMESPACE" &> /dev/null; then
        log_info "Grafana dashboards already configured"
    else
        kubectl create configmap grafana-dashboards \
            --from-file="$PROJECT_ROOT/observability/grafana/dashboards/" \
            --namespace="$NAMESPACE" \
            --dry-run=client -o yaml | kubectl apply -f -
    fi

    # Setup alerting rules
    kubectl apply -f "$PROJECT_ROOT/monitoring/prometheus/rules/" -n "$NAMESPACE" || log_warning "Alerting rules not found"

    log_success "Monitoring configured"
}

# Generate deployment report
generate_deployment_report() {
    local report_file="$PROJECT_ROOT/staging-deployment-$(date +%Y%m%d-%H%M%S).md"

    cat > "$report_file" << EOF
# IntelGraph Staging Deployment Report

**Date:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Environment:** staging
**Namespace:** $NAMESPACE

## Infrastructure Status

\`\`\`bash
# EKS Cluster
$(kubectl cluster-info)

# Node Status
$(kubectl get nodes -o wide)

# Deployment Status
$(kubectl get deployments -n "$NAMESPACE" -o wide)

# Service Status
$(kubectl get services -n "$NAMESPACE" -o wide)
\`\`\`

## Health Check Results

$(kubectl get pods -n "$NAMESPACE" -o wide)

## Access Information

- **Grafana:** Port-forward with \`kubectl port-forward -n $NAMESPACE svc/grafana 3000:3000\`
- **Prometheus:** Port-forward with \`kubectl port-forward -n $NAMESPACE svc/prometheus 9090:9090\`
- **API:** \`kubectl port-forward -n $NAMESPACE svc/intelgraph-server 8080:8080\`

## Next Steps

1. **Load Testing:** Execute k6 performance tests
2. **Chaos Engineering:** Run network latency experiments
3. **Security Validation:** Perform vulnerability scans
4. **Production Readiness:** Begin canary deployment process

---
Generated by IntelGraph deployment automation
EOF

    log_success "Deployment report generated: $report_file"
}

# Execute main function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
    generate_deployment_report
fi