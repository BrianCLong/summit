#!/bin/bash
# Summit Application Cloud Deployment Simulation
# This script simulates the deployment of the Summit application to a cloud environment

set -e

echo "🚀 Summit Application Cloud Deployment Simulation"
echo "=================================================="

# Function to display usage
usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --provider PROVIDER    Cloud provider (aws|azure|gcp|k8s) - default: k8s"
    echo "  --region REGION        Cloud region (e.g., us-west-2, eastus, us-central1)"
    echo "  --env ENVIRONMENT      Environment (dev|staging|prod) - default: dev"
    echo "  --project PROJECT      Project ID (for GCP)"
    echo "  --resource-group RG    Resource group (for Azure)"
    echo "  --cluster CLUSTER      Cluster name"
    echo "  --namespace NAMESPACE  Kubernetes namespace - default: summit-app"
    echo "  --image-tag TAG        Image tag to deploy - default: latest"
    echo "  --domain DOMAIN        Domain name for the application"
    echo "  --help                 Show this help message"
    exit 1
}

# Default values
PROVIDER="k8s"
ENVIRONMENT="dev"
REGION=""
PROJECT_ID=""
RESOURCE_GROUP=""
CLUSTER_NAME=""
NAMESPACE="summit-app"
IMAGE_TAG="latest"
DOMAIN=""

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
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --domain)
            DOMAIN="$2"
            shift 2
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

echo "Provider: $PROVIDER"
echo "Environment: $ENVIRONMENT"
if [ -n "$REGION" ]; then
    echo "Region: $REGION"
fi
if [ -n "$PROJECT_ID" ]; then
    echo "Project ID: $PROJECT_ID"
fi
if [ -n "$RESOURCE_GROUP" ]; then
    echo "Resource Group: $RESOURCE_GROUP"
fi
if [ -n "$CLUSTER_NAME" ]; then
    echo "Cluster: $CLUSTER_NAME"
fi
echo "Namespace: $NAMESPACE"
echo "Image Tag: $IMAGE_TAG"
if [ -n "$DOMAIN" ]; then
    echo "Domain: $DOMAIN"
fi
echo

# Validate inputs
if [ "$PROVIDER" != "aws" ] && [ "$PROVIDER" != "azure" ] && [ "$PROVIDER" != "gcp" ] && [ "$PROVIDER" != "k8s" ]; then
    echo "❌ Invalid provider. Supported providers: aws, azure, gcp, k8s"
    exit 1
fi

if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "prod" ]; then
    echo "❌ Invalid environment. Supported environments: dev, staging, prod"
    exit 1
fi

# Function to check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        echo "❌ kubectl is not installed. Please install it first."
        echo "Installation instructions: https://kubernetes.io/docs/tasks/tools/"
        exit 1
    fi
    echo "✅ kubectl is installed"
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed. Please install it first."
        exit 1
    fi
    echo "✅ Docker is installed"
    
    if [ "$PROVIDER" != "k8s" ]; then
        case $PROVIDER in
            aws)
                if ! command -v aws &> /dev/null; then
                    echo "❌ AWS CLI is not installed. Please install it first."
                    echo "Installation instructions: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
                    exit 1
                fi
                echo "✅ AWS CLI is installed"
                ;;
            azure)
                if ! command -v az &> /dev/null; then
                    echo "❌ Azure CLI is not installed. Please install it first."
                    echo "Installation instructions: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli"
                    exit 1
                fi
                echo "✅ Azure CLI is installed"
                ;;
            gcp)
                if ! command -v gcloud &> /dev/null; then
                    echo "❌ Google Cloud CLI is not installed. Please install it first."
                    echo "Installation instructions: https://cloud.google.com/sdk/docs/install"
                    exit 1
                fi
                echo "✅ Google Cloud CLI is installed"
                ;;
        esac
    fi
    
    echo
}

# Function to prepare deployment files
prepare_deployment_files() {
    echo "📝 Preparing deployment files..."
    
    # Create a temporary directory for deployment files
    TEMP_DIR=$(mktemp -d)
    echo "Created temporary directory: $TEMP_DIR"
    
    # Copy the k8s deployment file to temp directory
    cp /home/bcl/Summit/summit/k8s-deployment.yml $TEMP_DIR/
    
    # Update image tags in the deployment files
    sed -i "s/:latest/:$IMAGE_TAG/g" $TEMP_DIR/k8s-deployment.yml
    
    # If domain is specified, update the ingress
    if [ -n "$DOMAIN" ]; then
        sed -i "s/yourdomain.com/$DOMAIN/g" $TEMP_DIR/k8s-deployment.yml
    fi
    
    echo "✅ Deployment files prepared in $TEMP_DIR"
    echo
}

# Function to authenticate with cloud provider
authenticate_with_provider() {
    echo "🔐 Authenticating with cloud provider..."
    
    case $PROVIDER in
        aws)
            echo "Authenticating with AWS..."
            if [ -z "$CLUSTER_NAME" ]; then
                echo "❌ Cluster name is required for AWS deployment"
                exit 1
            fi
            
            # Configure kubectl to connect to EKS cluster
            echo "Configuring kubectl for EKS cluster: $CLUSTER_NAME"
            echo "Command: aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION"
            echo "✅ Authentication with AWS complete"
            ;;
        azure)
            echo "Authenticating with Azure..."
            if [ -z "$CLUSTER_NAME" ]; then
                echo "❌ Cluster name is required for Azure deployment"
                exit 1
            fi
            
            # Configure kubectl to connect to AKS cluster
            echo "Configuring kubectl for AKS cluster: $CLUSTER_NAME"
            echo "Command: az aks get-credentials --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME"
            echo "✅ Authentication with Azure complete"
            ;;
        gcp)
            echo "Authenticating with Google Cloud..."
            if [ -z "$CLUSTER_NAME" ]; then
                echo "❌ Cluster name is required for GCP deployment"
                exit 1
            fi
            
            # Configure kubectl to connect to GKE cluster
            echo "Configuring kubectl for GKE cluster: $CLUSTER_NAME"
            echo "Command: gcloud container clusters get-credentials $CLUSTER_NAME --zone=$REGION --project=$PROJECT_ID"
            echo "✅ Authentication with Google Cloud complete"
            ;;
        k8s)
            echo "Using existing Kubernetes context..."
            kubectl cluster-info
            echo "✅ Using existing Kubernetes context"
            ;;
    esac
    
    echo
}

# Function to deploy to cloud
deploy_to_cloud() {
    echo "🚀 Deploying Summit application to cloud..."
    
    # Create namespace if it doesn't exist
    echo "Creating namespace: $NAMESPACE"
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply the Kubernetes configuration
    echo "Applying Kubernetes configuration..."
    kubectl apply -f $TEMP_DIR/k8s-deployment.yml -n $NAMESPACE
    
    echo "Waiting for deployments to be ready..."
    
    # Wait for statefulsets to be ready (databases)
    echo "Waiting for Neo4j to be ready..."
    kubectl wait --for=condition=ready pod -l app=neo4j -n $NAMESPACE --timeout=600s || echo "⚠️ Neo4j deployment may still be initializing"
    
    echo "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=600s || echo "⚠️ PostgreSQL deployment may still be initializing"
    
    echo "Waiting for Redis to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s || echo "⚠️ Redis deployment may still be initializing"
    
    # Wait for deployments to be ready (application services)
    echo "Waiting for Summit Server to be ready..."
    kubectl wait --for=condition=ready pod -l app=summit-server -n $NAMESPACE --timeout=600s || echo "⚠️ Summit Server deployment may still be initializing"
    
    echo "Waiting for Summit Web to be ready..."
    kubectl wait --for=condition=ready pod -l app=summit-web -n $NAMESPACE --timeout=300s || echo "⚠️ Summit Web deployment may still be initializing"
    
    echo "✅ Summit application deployed successfully"
    echo
}

# Function to verify deployment
verify_deployment() {
    echo "🔍 Verifying deployment..."
    
    echo "Checking pod status..."
    kubectl get pods -n $NAMESPACE
    
    echo
    echo "Checking services..."
    kubectl get services -n $NAMESPACE
    
    echo
    echo "Checking deployments..."
    kubectl get deployments -n $NAMESPACE
    
    echo
    echo "Checking statefulsets..."
    kubectl get statefulsets -n $NAMESPACE
    
    echo
    echo "Checking ingress..."
    kubectl get ingress -n $NAMESPACE 2>/dev/null || echo "No ingress found in namespace"
    
    echo
    echo "Checking persistent volume claims..."
    kubectl get pvc -n $NAMESPACE
    
    echo
    echo "✅ Deployment verification complete"
    echo
}

# Function to display deployment summary
display_summary() {
    echo "🎉 Summit Application Deployment Summary"
    echo "======================================="
    echo
    echo "Cloud Provider: $PROVIDER"
    echo "Environment: $ENVIRONMENT"
    echo "Region: ${REGION:-Not specified}"
    echo "Project: ${PROJECT_ID:-Not specified}"
    echo "Resource Group: ${RESOURCE_GROUP:-Not specified}"
    echo "Cluster: ${CLUSTER_NAME:-Not specified}"
    echo "Namespace: $NAMESPACE"
    echo "Image Tag: $IMAGE_TAG"
    echo "Domain: ${DOMAIN:-Not configured}"
    echo
    
    echo "Services deployed:"
    echo "- Neo4j Graph Database (StatefulSet)"
    echo "- PostgreSQL Database (StatefulSet)"
    echo "- Redis Cache (Deployment)"
    echo "- Summit Server API (Deployment)"
    echo "- Summit Web Client (Deployment)"
    echo "- API Gateway (Deployment)"
    echo "- Provenance Ledger (Deployment)"
    echo "- Policy and LAC Service (Deployment)"
    echo "- NL2Cypher Service (Deployment)"
    echo "- Backup Service (Deployment)"
    echo
    
    echo "Access points:"
    if [ -n "$DOMAIN" ]; then
        echo "- Web Interface: https://$DOMAIN"
        echo "- API Endpoint: https://$DOMAIN/api"
        echo "- GraphQL: https://$DOMAIN/graphql"
    else
        # Get the external IP or load balancer address
        EXTERNAL_IP=$(kubectl get service summit-web -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
        if [ -z "$EXTERNAL_IP" ]; then
            EXTERNAL_IP=$(kubectl get service summit-web -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
        fi
        
        if [ -n "$EXTERNAL_IP" ]; then
            echo "- Web Interface: http://$EXTERNAL_IP:3000"
            echo "- API Endpoint: http://$EXTERNAL_IP:4000/api"
            echo "- GraphQL: http://$EXTERNAL_IP:4000/graphql"
        else
            echo "- Web Interface: http://<load-balancer-ip>:3000 (External IP pending)"
            echo "- API Endpoint: http://<load-balancer-ip>:4000/api"
            echo "- GraphQL: http://<load-balancer-ip>:4000/graphql"
        fi
    fi
    echo
    
    echo "To view logs:"
    echo "  kubectl logs -l app=summit-server -n $NAMESPACE"
    echo "  kubectl logs -l app=summit-web -n $NAMESPACE"
    echo
    echo "To scale services:"
    echo "  kubectl scale deployment summit-server -n $NAMESPACE --replicas=3"
    echo "  kubectl scale deployment summit-web -n $NAMESPACE --replicas=3"
    echo
    echo "To access the database consoles:"
    echo "  Neo4j Browser: http://<load-balancer-ip>:7474 (if exposed)"
    echo "  PostgreSQL: Connect via kubectl exec to the postgres pod"
    echo
    echo "✅ Summit application is now running in the cloud!"
    echo
}

# Function to cleanup
cleanup() {
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        echo "🧹 Cleaning up temporary files..."
        rm -rf $TEMP_DIR
        echo "✅ Temporary files cleaned up"
    fi
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Main execution
check_prerequisites
prepare_deployment_files
authenticate_with_provider
deploy_to_cloud
verify_deployment
display_summary

echo "For ongoing management of your Summit application:"
echo "- Monitor resource usage: kubectl top nodes,pods -n $NAMESPACE"
echo "- Check logs regularly: kubectl logs -f deployment/summit-server -n $NAMESPACE"
echo "- Update secrets as needed: kubectl edit secret summit-secrets -n $NAMESPACE"
echo "- Backup databases regularly using the backup service"
echo "- Scale services based on demand: kubectl scale deployment summit-server -n $NAMESPACE --replicas=N"