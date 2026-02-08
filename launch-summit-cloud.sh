#!/bin/bash
# Summit Application - Quick Cloud Launch Script
# This script orchestrates the complete cloud deployment process

set -e

echo "🚀 Summit Application - Quick Cloud Launch"
echo "========================================"

# Function to display usage
usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --provider PROVIDER    Cloud provider (aws|azure|gcp) - default: aws"
    echo "  --region REGION        Cloud region (e.g., us-west-2, eastus, us-central1)"
    echo "  --env ENVIRONMENT      Environment (dev|staging|prod) - default: dev"
    echo "  --project PROJECT      Project ID (for GCP)"
    echo "  --resource-group RG    Resource group (for Azure)"
    echo "  --cluster CLUSTER      Cluster name"
    echo "  --domain DOMAIN        Domain name for the application (required)"
    echo "  --email EMAIL          Email for SSL certificate registration"
    echo "  --full-test-suite      Run full test suite after deployment"
    echo "  --help                 Show this help message"
    exit 1
}

# Default values
PROVIDER="aws"
ENVIRONMENT="dev"
REGION=""
PROJECT_ID=""
RESOURCE_GROUP=""
CLUSTER_NAME=""
DOMAIN=""
EMAIL=""
FULL_TEST_SUITE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --provider)
            PROVIDER="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --project)
            PROJECT_ID="$2"
            shift 2
            ;;
        --resource-group)
            RESOURCE_GROUP="$2"
            shift 2
            ;;
        --cluster)
            CLUSTER_NAME="$2"
            shift 2
            ;;
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --email)
            EMAIL="$2"
            shift 2
            ;;
        --full-test-suite)
            FULL_TEST_SUITE=true
            shift
            ;;
        --help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Validate required inputs
if [ -z "$DOMAIN" ]; then
    echo "❌ Domain is required"
    exit 1
fi

if [ -z "$REGION" ]; then
    echo "❌ Region is required"
    exit 1
fi

if [ -z "$CLUSTER_NAME" ]; then
    echo "❌ Cluster name is required"
    exit 1
fi

if [ -z "$EMAIL" ]; then
    echo "❌ Email is required for SSL certificate registration"
    exit 1
fi

echo "Provider: $PROVIDER"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "Project ID: $PROJECT_ID"
echo "Resource Group: $RESOURCE_GROUP"
echo "Cluster: $CLUSTER_NAME"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "Full Test Suite: $FULL_TEST_SUITE"
echo

# Change to the summit directory
cd /home/bcl/Summit/summit

echo "Starting Summit application cloud deployment..."
echo

# Step 1: Setup infrastructure
echo "Step 1: Setting up cloud infrastructure..."
if [ "$PROVIDER" = "gcp" ] && [ -n "$PROJECT_ID" ]; then
    ./setup-cloud-infrastructure.sh --provider $PROVIDER --region $REGION --env $ENVIRONMENT --project $PROJECT_ID
elif [ "$PROVIDER" = "azure" ] && [ -n "$RESOURCE_GROUP" ]; then
    ./setup-cloud-infrastructure.sh --provider $PROVIDER --region $REGION --env $ENVIRONMENT --resource-group $RESOURCE_GROUP
else
    ./setup-cloud-infrastructure.sh --provider $PROVIDER --region $REGION --env $ENVIRONMENT
fi
echo "✅ Infrastructure setup complete"
echo

# Step 2: Deploy application
echo "Step 2: Deploying Summit application..."
if [ "$PROVIDER" = "gcp" ] && [ -n "$PROJECT_ID" ]; then
    ./deploy-application-cloud.sh --provider $PROVIDER --region $REGION --env $ENVIRONMENT --project $PROJECT_ID --cluster $CLUSTER_NAME --domain $DOMAIN
elif [ "$PROVIDER" = "azure" ] && [ -n "$RESOURCE_GROUP" ]; then
    ./deploy-application-cloud.sh --provider $PROVIDER --region $REGION --env $ENVIRONMENT --resource-group $RESOURCE_GROUP --cluster $CLUSTER_NAME --domain $DOMAIN
else
    ./deploy-application-cloud.sh --provider $PROVIDER --region $REGION --env $ENVIRONMENT --cluster $CLUSTER_NAME --domain $DOMAIN
fi
echo "✅ Application deployment complete"
echo

# Step 3: Configure security and domain
echo "Step 3: Configuring security and domain..."
./configure-security-domain.sh --provider $PROVIDER --env $ENVIRONMENT --domain $DOMAIN --email $EMAIL --enable-auth
echo "✅ Security and domain configuration complete"
echo

# Step 4: Validate deployment
echo "Step 4: Validating deployment..."
if [ "$FULL_TEST_SUITE" = true ]; then
    ./validate-deployment.sh --domain $DOMAIN --full-test-suite
else
    ./validate-deployment.sh --domain $DOMAIN
fi
echo "✅ Deployment validation complete"
echo

echo "🎉 Summit Application Cloud Launch Complete!"
echo "==========================================="
echo
echo "Your Summit application is now running in the cloud!"
echo
echo "Access your application at: https://$DOMAIN"
echo
echo "Key endpoints:"
echo "- Web Interface: https://$DOMAIN"
echo "- API Endpoint: https://$DOMAIN/api"
echo "- GraphQL: https://$DOMAIN/graphql"
echo
echo "Management commands:"
echo "- View logs: kubectl logs -l app=summit-server -n summit-app"
echo "- Scale services: kubectl scale deployment summit-server -n summit-app --replicas=3"
echo "- Check status: kubectl get pods -n summit-app"
echo
echo "For ongoing maintenance, refer to SUMMIT_CLOUD_LAUNCH_GUIDE.md"
echo
echo "Thank you for deploying Summit!"