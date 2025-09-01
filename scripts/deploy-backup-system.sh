#!/bin/bash
#
# IntelGraph Backup & Disaster Recovery System Deployment Script
# 
# This script deploys the comprehensive backup and DR system for IntelGraph
# 
# Usage: ./scripts/deploy-backup-system.sh [options]
# Options:
#   --dry-run       Show what would be deployed without making changes
#   --environment   Environment (prod|staging|dev) - default: prod
#   --region        AWS region - default: us-west-2
#   --dr-region     DR AWS region - default: us-east-1
#   --help          Show this help message

set -euo pipefail

# Default configuration
ENVIRONMENT="prod"
AWS_REGION="us-west-2"
DR_REGION="us-east-1"
DRY_RUN=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Help function
show_help() {
    cat << EOF
IntelGraph Backup & Disaster Recovery System Deployment

Usage: $0 [options]

Options:
  --dry-run         Show what would be deployed without making changes
  --environment     Environment (prod|staging|dev) - default: prod
  --region          AWS region - default: us-west-2
  --dr-region       DR AWS region - default: us-east-1
  --help            Show this help message

Examples:
  $0 --environment prod --region us-west-2
  $0 --dry-run --environment staging
  $0 --help

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        --dr-region)
            DR_REGION="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(prod|staging|dev)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be prod, staging, or dev."
    exit 1
fi

# Configuration based on environment
case $ENVIRONMENT in
    prod)
        CLUSTER_NAME="intelgraph-prod"
        DR_CLUSTER_NAME="intelgraph-dr"
        BACKUP_BUCKET="intelgraph-backups-prod"
        DR_BACKUP_BUCKET="intelgraph-backups-dr"
        ;;
    staging)
        CLUSTER_NAME="intelgraph-staging"
        DR_CLUSTER_NAME="intelgraph-staging-dr"
        BACKUP_BUCKET="intelgraph-backups-staging"
        DR_BACKUP_BUCKET="intelgraph-backups-staging-dr"
        ;;
    dev)
        CLUSTER_NAME="intelgraph-dev"
        DR_CLUSTER_NAME="intelgraph-dev-dr"
        BACKUP_BUCKET="intelgraph-backups-dev"
        DR_BACKUP_BUCKET="intelgraph-backups-dev-dr"
        ;;
esac

log_info "IntelGraph Backup & DR System Deployment"
log_info "Environment: $ENVIRONMENT"
log_info "Primary Region: $AWS_REGION"
log_info "DR Region: $DR_REGION"
log_info "Cluster: $CLUSTER_NAME"
log_info "Backup Bucket: $BACKUP_BUCKET"
if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN MODE - No changes will be made"
fi
echo

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is required but not installed"
        exit 1
    fi
    
    # Check aws cli
    if ! command -v aws &> /dev/null; then
        log_error "aws cli is required but not installed"
        exit 1
    fi
    
    # Check helm
    if ! command -v helm &> /dev/null; then
        log_error "helm is required but not installed"
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi
    
    log_success "All prerequisites met"
}

# Create S3 buckets if they don't exist
create_s3_buckets() {
    log_info "Creating S3 buckets..."
    
    local buckets=("$BACKUP_BUCKET" "$DR_BACKUP_BUCKET")
    local regions=("$AWS_REGION" "$DR_REGION")
    
    for i in "${!buckets[@]}"; do
        local bucket="${buckets[$i]}"
        local region="${regions[$i]}"
        
        if $DRY_RUN; then
            log_info "[DRY RUN] Would create S3 bucket: $bucket in region $region"
        else
            if aws s3api head-bucket --bucket "$bucket" --region "$region" 2>/dev/null; then
                log_info "S3 bucket $bucket already exists"
            else
                log_info "Creating S3 bucket: $bucket in region $region"
                aws s3api create-bucket \
                    --bucket "$bucket" \
                    --region "$region" \
                    --create-bucket-configuration LocationConstraint="$region"
                
                # Enable versioning
                aws s3api put-bucket-versioning \
                    --bucket "$bucket" \
                    --versioning-configuration Status=Enabled \
                    --region "$region"
                
                # Enable encryption
                aws s3api put-bucket-encryption \
                    --bucket "$bucket" \
                    --server-side-encryption-configuration '{
                        "Rules": [{
                            "ApplyServerSideEncryptionByDefault": {
                                "SSEAlgorithm": "AES256"
                            },
                            "BucketKeyEnabled": true
                        }]
                    }' \
                    --region "$region"
                
                # Block public access
                aws s3api put-public-access-block \
                    --bucket "$bucket" \
                    --public-access-block-configuration \
                        BlockPublicAcls=true,\
                        IgnorePublicAcls=true,\
                        BlockPublicPolicy=true,\
                        RestrictPublicBuckets=true \
                    --region "$region"
                
                log_success "Created and configured S3 bucket: $bucket"
            fi
        fi
    done
}

# Deploy Kubernetes resources
deploy_kubernetes_resources() {
    log_info "Deploying Kubernetes resources..."
    
    local backup_charts_dir="$PROJECT_ROOT/charts/backup"
    
    # Create namespace and base configuration
    if $DRY_RUN; then
        log_info "[DRY RUN] Would apply: $backup_charts_dir/backup-config.yaml"
    else
        log_info "Applying backup system configuration..."
        kubectl apply -f "$backup_charts_dir/backup-config.yaml"
    fi
    
    # Update ConfigMap with environment-specific values
    if ! $DRY_RUN; then
        kubectl patch configmap backup-config -n backup-system --type merge -p '{
            "data": {
                "aws-region": "'$AWS_REGION'",
                "dr-aws-region": "'$DR_REGION'",
                "backup-bucket": "'$BACKUP_BUCKET'",
                "dr-backup-bucket": "'$DR_BACKUP_BUCKET'",
                "cluster-name": "'$CLUSTER_NAME'",
                "dr-cluster-name": "'$DR_CLUSTER_NAME'"
            }
        }'
    fi
    
    # Deploy backup jobs
    local backup_files=(
        "neo4j-backup-cron.yaml"
        "postgres-backup-cron.yaml"
        "redis-backup-cron.yaml"
        "k8s-config-backup-cron.yaml"
        "backup-validation-cron.yaml"
    )
    
    for file in "${backup_files[@]}"; do
        if $DRY_RUN; then
            log_info "[DRY RUN] Would apply: $backup_charts_dir/$file"
        else
            log_info "Deploying: $file"
            kubectl apply -f "$backup_charts_dir/$file"
        fi
    done
    
    # Deploy security and monitoring
    if $DRY_RUN; then
        log_info "[DRY RUN] Would apply security policy"
        log_info "[DRY RUN] Would apply monitoring configuration"
        log_info "[DRY RUN] Would apply DR infrastructure"
    else
        log_info "Deploying security policies..."
        kubectl apply -f "$backup_charts_dir/backup-security-policy.yaml"
        
        log_info "Deploying monitoring configuration..."
        kubectl apply -f "$backup_charts_dir/backup-monitoring.yaml"
        
        log_info "Deploying DR infrastructure..."
        kubectl apply -f "$backup_charts_dir/disaster-recovery-infrastructure.yaml"
    fi
}

# Create IAM roles and policies
create_iam_resources() {
    log_info "Creating IAM roles and policies..."
    
    if $DRY_RUN; then
        log_info "[DRY RUN] Would create IAM roles for backup services"
        return
    fi
    
    # Get AWS account ID
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    
    # Create trust policy for EKS service accounts
    local trust_policy='{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Federated": "arn:aws:iam::'$account_id':oidc-provider/oidc.eks.'$AWS_REGION'.amazonaws.com/id/OIDC_PROVIDER_ID"
                },
                "Action": "sts:AssumeRoleWithWebIdentity",
                "Condition": {
                    "StringEquals": {
                        "oidc.eks.'$AWS_REGION'.amazonaws.com/id/OIDC_PROVIDER_ID:sub": "system:serviceaccount:backup-system:SERVICE_ACCOUNT_NAME",
                        "oidc.eks.'$AWS_REGION'.amazonaws.com/id/OIDC_PROVIDER_ID:aud": "sts.amazonaws.com"
                    }
                }
            }
        ]
    }'
    
    # Backup policy
    local backup_policy='{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:GetObject",
                    "s3:PutObject",
                    "s3:DeleteObject",
                    "s3:ListBucket",
                    "s3:GetBucketVersioning",
                    "s3:GetBucketLocation"
                ],
                "Resource": [
                    "arn:aws:s3:::'$BACKUP_BUCKET'",
                    "arn:aws:s3:::'$BACKUP_BUCKET'/*",
                    "arn:aws:s3:::'$DR_BACKUP_BUCKET'",
                    "arn:aws:s3:::'$DR_BACKUP_BUCKET'/*"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "kms:Decrypt",
                    "kms:DescribeKey",
                    "kms:Encrypt",
                    "kms:GenerateDataKey",
                    "kms:ReEncrypt*"
                ],
                "Resource": "*"
            }
        ]
    }'
    
    log_info "IAM resources would be created here (implementation depends on OIDC provider setup)"
    log_warning "Please create IAM roles manually or use infrastructure as code tools"
}

# Validate deployment
validate_deployment() {
    log_info "Validating deployment..."
    
    if $DRY_RUN; then
        log_info "[DRY RUN] Would validate deployment"
        return
    fi
    
    # Check if backup-system namespace exists
    if kubectl get namespace backup-system &> /dev/null; then
        log_success "backup-system namespace created"
    else
        log_error "backup-system namespace not found"
        return 1
    fi
    
    # Check if ConfigMaps exist
    local configmaps=("backup-config" "dr-config" "backup-security-config")
    for cm in "${configmaps[@]}"; do
        if kubectl get configmap "$cm" -n backup-system &> /dev/null; then
            log_success "ConfigMap $cm exists"
        else
            log_error "ConfigMap $cm not found"
        fi
    done
    
    # Check if CronJobs are scheduled
    local cronjobs=(
        "neo4j-backup"
        "postgres-backup"
        "redis-backup"
        "k8s-config-backup"
        "backup-validation"
    )
    
    for job in "${cronjobs[@]}"; do
        if kubectl get cronjob "$job" -n database &> /dev/null || \
           kubectl get cronjob "$job" -n backup-system &> /dev/null; then
            log_success "CronJob $job scheduled"
        else
            log_error "CronJob $job not found"
        fi
    done
    
    # Check ServiceMonitors for monitoring
    if kubectl get servicemonitor backup-metrics -n backup-system &> /dev/null; then
        log_success "Backup monitoring configured"
    else
        log_warning "Backup monitoring ServiceMonitor not found"
    fi
}

# Display next steps
show_next_steps() {
    log_info "Deployment completed. Next steps:"
    echo
    echo "1. Configure Secrets (replace PLACEHOLDER values):"
    echo "   kubectl edit secret backup-secrets -n backup-system"
    echo
    echo "2. Update IAM roles with correct OIDC provider ID:"
    echo "   - Get OIDC provider: aws eks describe-cluster --name $CLUSTER_NAME --query cluster.identity.oidc.issuer"
    echo "   - Create/update IAM roles with proper trust relationships"
    echo
    echo "3. Test backup operations:"
    echo "   kubectl create job test-postgres-backup --from=cronjob/postgres-backup -n database"
    echo "   kubectl create job test-neo4j-backup --from=cronjob/neo4j-backup -n database"
    echo
    echo "4. Verify monitoring:"
    echo "   kubectl port-forward svc/backup-metrics-collector 8080:8080 -n backup-system"
    echo "   curl http://localhost:8080/metrics"
    echo
    echo "5. Run validation:"
    echo "   kubectl create job manual-validation --from=cronjob/backup-validation -n backup-system"
    echo
    echo "6. Configure disaster recovery runbooks:"
    echo "   Review and customize: $PROJECT_ROOT/RUNBOOKS/disaster-recovery-procedures.yaml"
    echo
    log_success "IntelGraph Backup & DR System deployment completed!"
}

# Main deployment flow
main() {
    log_info "Starting IntelGraph Backup & DR System deployment..."
    
    check_prerequisites
    create_s3_buckets
    deploy_kubernetes_resources
    create_iam_resources
    validate_deployment
    show_next_steps
}

# Run main function
main "$@"