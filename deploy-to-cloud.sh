#!/bin/bash
# Summit Application Cloud Deployment Script
# This script deploys the Summit application to a cloud environment

set -e

echo "🚀 Summit Application Cloud Deployment Script"
echo "=============================================="

# Function to display usage
usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --provider PROVIDER    Cloud provider (aws|azure|gcp|k8s) - default: k8s"
    echo "  --region REGION        Cloud region (e.g., us-west-2, eastus, us-central1)"
    echo "  --env ENVIRONMENT      Environment (dev|staging|prod) - default: dev"
    echo "  --domain DOMAIN        Domain name for the application"
    echo "  --help                 Show this help message"
    exit 1
}

# Default values
PROVIDER="k8s"
ENVIRONMENT="dev"
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
echo "Domain: $DOMAIN"
if [ -n "$REGION" ]; then
    echo "Region: $REGION"
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
    
    case $PROVIDER in
        aws)
            if ! command -v aws &> /dev/null; then
                echo "❌ AWS CLI is not installed. Please install it first."
                exit 1
            fi
            if ! command -v kubectl &> /dev/null; then
                echo "❌ kubectl is not installed. Please install it first."
                exit 1
            fi
            echo "✅ AWS CLI and kubectl are installed"
            ;;
        azure)
            if ! command -v az &> /dev/null; then
                echo "❌ Azure CLI is not installed. Please install it first."
                exit 1
            fi
            if ! command -v kubectl &> /dev/null; then
                echo "❌ kubectl is not installed. Please install it first."
                exit 1
            fi
            echo "✅ Azure CLI and kubectl are installed"
            ;;
        gcp)
            if ! command -v gcloud &> /dev/null; then
                echo "❌ Google Cloud CLI is not installed. Please install it first."
                exit 1
            fi
            if ! command -v kubectl &> /dev/null; then
                echo "❌ kubectl is not installed. Please install it first."
                exit 1
            fi
            echo "✅ Google Cloud CLI and kubectl are installed"
            ;;
        k8s)
            if ! command -v kubectl &> /dev/null; then
                echo "❌ kubectl is not installed. Please install it first."
                exit 1
            fi
            echo "✅ kubectl is installed"
            ;;
    esac
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed. Please install it first."
        exit 1
    fi
    echo "✅ Docker is installed"
    
    if ! command -v pnpm &> /dev/null; then
        echo "❌ pnpm is not installed. Please install it first."
        exit 1
    fi
    echo "✅ pnpm is installed"
    
    echo
}

# Function to setup cloud infrastructure
setup_infrastructure() {
    echo "🏗️ Setting up cloud infrastructure..."
    
    case $PROVIDER in
        aws)
            echo "Setting up AWS infrastructure..."
            
            # Create ECR repositories for Summit services
            echo "Creating ECR repositories..."
            aws ecr create-repository --repository-name summit-server --region $REGION 2>/dev/null || echo "ECR repository summit-server already exists"
            aws ecr create-repository --repository-name summit-web --region $REGION 2>/dev/null || echo "ECR repository summit-web already exists"
            aws ecr create-repository --repository-name summit-api-gateway --region $REGION 2>/dev/null || echo "ECR repository summit-api-gateway already exists"
            aws ecr create-repository --repository-name summit-prov-ledger --region $REGION 2>/dev/null || echo "ECR repository summit-prov-ledger already exists"
            aws ecr create-repository --repository-name summit-policy-lac --region $REGION 2>/dev/null || echo "ECR repository summit-policy-lac already exists"
            aws ecr create-repository --repository-name summit-nl2cypher --region $REGION 2>/dev/null || echo "ECR repository summit-nl2cypher already exists"
            
            # Configure kubectl to connect to EKS cluster
            echo "Configuring kubectl for EKS..."
            aws eks update-kubeconfig --name summit-${ENVIRONMENT}-cluster --region $REGION
            
            echo "✅ AWS infrastructure setup complete"
            ;;
        azure)
            echo "Setting up Azure infrastructure..."
            
            # Create container registries for Summit services
            echo "Creating Azure Container Registry..."
            az acr create --resource-group summit-${ENVIRONMENT}-rg --name SummitRegistry${ENVIRONMENT^} --sku Basic --admin-enabled true
            
            # Configure kubectl to connect to AKS cluster
            echo "Configuring kubectl for AKS..."
            az aks get-credentials --resource-group summit-${ENVIRONMENT}-rg --name summit-${ENVIRONMENT}-aks
            
            echo "✅ Azure infrastructure setup complete"
            ;;
        gcp)
            echo "Setting up Google Cloud infrastructure..."
            
            # Create Artifact Registry for Summit services
            echo "Creating Google Cloud Artifact Registry..."
            gcloud artifacts repositories create summit-repo --repository-format=docker --location=$REGION --description="Docker repository for Summit application"
            
            # Configure kubectl to connect to GKE cluster
            echo "Configuring kubectl for GKE..."
            gcloud container clusters get-credentials summit-${ENVIRONMENT}-cluster --zone=$REGION
            
            echo "✅ Google Cloud infrastructure setup complete"
            ;;
        k8s)
            echo "Using existing Kubernetes cluster..."
            kubectl cluster-info
            echo "✅ Kubernetes cluster verified"
            ;;
    esac
    
    echo
}

# Function to build and push Docker images
build_and_push_images() {
    echo "🔨 Building and pushing Docker images..."
    
    cd /home/bcl/Summit/summit
    
    # Build and tag images
    echo "Building Summit server image..."
    docker build -t summit-server:latest -f server/Dockerfile .
    
    echo "Building Summit web client image..."
    docker build -t summit-web:latest -f apps/web/Dockerfile .
    
    # Tag images for cloud registry
    case $PROVIDER in
        aws)
            AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
            AWS_REGION=$REGION
            
            docker tag summit-server:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/summit-server:latest
            docker tag summit-web:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/summit-web:latest
            
            # Login to ECR
            aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
            
            # Push images
            docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/summit-server:latest
            docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/summit-web:latest
            ;;
        azure)
            AZURE_REGISTRY_NAME="SummitRegistry${ENVIRONMENT^}"
            ACR_LOGIN_SERVER=$(az acr show --name $AZURE_REGISTRY_NAME --query loginServer --output tsv)
            
            docker tag summit-server:latest ${ACR_LOGIN_SERVER}/summit-server:latest
            docker tag summit-web:latest ${ACR_LOGIN_SERVER}/summit-web:latest
            
            # Login to ACR
            az acr login --name $AZURE_REGISTRY_NAME
            
            # Push images
            docker push ${ACR_LOGIN_SERVER}/summit-server:latest
            docker push ${ACR_LOGIN_SERVER}/summit-web:latest
            ;;
        gcp)
            PROJECT_ID=$(gcloud config get-value project)
            GCLOUD_REGION=$REGION
            
            docker tag summit-server:latest gcr.io/${PROJECT_ID}/summit-server:latest
            docker tag summit-web:latest gcr.io/${PROJECT_ID}/summit-web:latest
            
            # Configure Docker to use gcloud as credential helper
            gcloud auth configure-docker
            
            # Push images
            docker push gcr.io/${PROJECT_ID}/summit-server:latest
            docker push gcr.io/${PROJECT_ID}/summit-web:latest
            ;;
        k8s)
            # For local Kubernetes, we'll use kind or minikube
            # Load images into the cluster
            if command -v kind &> /dev/null; then
                kind load docker-image summit-server:latest
                kind load docker-image summit-web:latest
            elif command -v minikube &> /dev/null; then
                minikube image load summit-server:latest
                minikube image load summit-web:latest
            else
                echo "⚠️ Neither kind nor minikube detected. Assuming external cluster."
            fi
            ;;
    esac
    
    echo "✅ Docker images built and pushed"
    echo
}

# Function to deploy to cloud
deploy_to_cloud() {
    echo "🚀 Deploying Summit application to cloud..."
    
    cd /home/bcl/Summit/summit
    
    # Create namespace if it doesn't exist
    kubectl create namespace summit-app --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply the Kubernetes configuration
    kubectl apply -f k8s-deployment.yml
    
    echo "Waiting for deployments to be ready..."
    
    # Wait for deployments to be ready
    kubectl wait --for=condition=ready pod -l app=neo4j -n summit-app --timeout=300s
    kubectl wait --for=condition=ready pod -l app=postgres -n summit-app --timeout=300s
    kubectl wait --for=condition=ready pod -l app=redis -n summit-app --timeout=300s
    kubectl wait --for=condition=ready pod -l app=summit-server -n summit-app --timeout=300s
    kubectl wait --for=condition=ready pod -l app=summit-web -n summit-app --timeout=300s
    
    echo "✅ Summit application deployed successfully"
    echo
}

# Function to configure domain and SSL
configure_domain_ssl() {
    echo "🔐 Configuring domain and SSL certificates..."
    
    if [ -n "$DOMAIN" ]; then
        echo "Configuring custom domain: $DOMAIN"
        
        # Update ingress configuration with the domain
        sed -i "s/yourdomain.com/$DOMAIN/g" k8s-deployment.yml
        
        # Reapply the ingress configuration
        kubectl apply -f k8s-deployment.yml
        
        echo "✅ Domain configured: $DOMAIN"
    else
        echo "⚠️ No domain specified. Using default configuration."
    fi
    
    echo
}

# Function to run post-deployment tests
post_deployment_tests() {
    echo "🧪 Running post-deployment tests..."
    
    # Check if all pods are running
    echo "Checking pod status..."
    kubectl get pods -n summit-app
    
    # Check services
    echo "Checking services..."
    kubectl get services -n summit-app
    
    # Check ingress
    echo "Checking ingress..."
    kubectl get ingress -n summit-app
    
    # Wait a bit for everything to be fully ready
    sleep 30
    
    echo "✅ Post-deployment checks completed"
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
    echo "Domain: ${DOMAIN:-Not configured}"
    echo
    echo "Services deployed:"
    echo "- Neo4j Graph Database"
    echo "- PostgreSQL Database" 
    echo "- Redis Cache"
    echo "- Summit Server API"
    echo "- Summit Web Client"
    echo "- API Gateway"
    echo "- Provenance Ledger"
    echo "- Policy and LAC Service"
    echo "- NL2Cypher Service"
    echo
    echo "Access points:"
    if [ -n "$DOMAIN" ]; then
        echo "- Web Interface: https://$DOMAIN"
        echo "- API Endpoint: https://$DOMAIN/api"
        echo "- GraphQL: https://$DOMAIN/graphql"
    else
        echo "- Web Interface: http://<load-balancer-ip>:3000"
        echo "- API Endpoint: http://<load-balancer-ip>:4000/api"
        echo "- GraphQL: http://<load-balancer-ip>:4000/graphql"
    fi
    echo
    echo "To view logs:"
    echo "  kubectl logs -l app=summit-server -n summit-app"
    echo "  kubectl logs -l app=summit-web -n summit-app"
    echo
    echo "To scale services:"
    echo "  kubectl scale deployment summit-server -n summit-app --replicas=3"
    echo "  kubectl scale deployment summit-web -n summit-app --replicas=3"
    echo
    echo "✅ Summit application is now running in the cloud!"
}

# Main execution
check_prerequisites
setup_infrastructure
build_and_push_images
deploy_to_cloud
configure_domain_ssl
post_deployment_tests
display_summary

echo
echo "For ongoing maintenance:"
echo "- Monitor resource usage: kubectl top nodes,pods -n summit-app"
echo "- Check logs regularly: kubectl logs -f deployment/summit-server -n summit-app"
echo "- Update secrets as needed: kubectl edit secret summit-secrets -n summit-app"
echo "- Backup databases regularly using the backup service"