# Summit Application - Complete Cloud Launch Guide

## Overview

This document provides a comprehensive guide to launching the Summit application in a cloud environment. Summit is an open-source intelligence gathering platform powered by agentic AI, knowledge graphs, and real-time data ingestion.

## Architecture

The Summit application consists of multiple interconnected services:

- **Neo4j Graph Database**: Stores and manages the knowledge graph
- **PostgreSQL Database**: Manages relational data and metadata
- **Redis Cache**: Provides caching and session storage
- **Summit Server**: Main API server with GraphQL and REST endpoints
- **Summit Web Client**: React-based frontend application
- **API Gateway**: Handles routing and policy enforcement
- **Provenance Ledger**: Tracks data provenance and audit trails
- **Policy and LAC Service**: Enforces access controls and policies
- **NL2Cypher Service**: Converts natural language to Cypher queries

## Cloud Deployment Components

### 1. Infrastructure Setup Scripts
- `setup-cloud-infrastructure.sh`: Sets up cloud infrastructure (VPC, subnets, databases, etc.)
- Supports AWS, Azure, and Google Cloud Platform

### 2. Application Deployment Scripts
- `deploy-application-cloud.sh`: Deploys the Summit application to the cloud
- Handles Kubernetes deployments and service configurations

### 3. Security & Domain Configuration
- `configure-security-domain.sh`: Configures SSL certificates, domain, and security settings
- Implements network policies, RBAC, and authentication

### 4. Validation & Testing
- `validate-deployment.sh`: Performs comprehensive tests on the deployed application
- Validates connectivity, functionality, and security

### 5. Configuration Files
- `cloud-deployment.yml`: Docker Compose configuration for cloud deployment
- `k8s-deployment.yml`: Kubernetes deployment manifests
- `CLOUD_DEPLOYMENT_README.md`: Detailed deployment documentation

## Deployment Process

### Step 1: Infrastructure Setup
Run the infrastructure setup script for your chosen cloud provider:

```bash
# For AWS
./setup-cloud-infrastructure.sh --provider aws --region us-west-2 --env prod

# For Azure
./setup-cloud-infrastructure.sh --provider azure --region eastus --env prod

# For GCP
./setup-cloud-infrastructure.sh --provider gcp --region us-central1 --env prod --project your-project-id
```

### Step 2: Application Deployment
Deploy the Summit application to your cloud environment:

```bash
# Deploy to cloud
./deploy-application-cloud.sh --provider aws --region us-west-2 --env prod --cluster your-cluster-name --domain yourdomain.com
```

### Step 3: Security & Domain Configuration
Configure SSL certificates, domain, and security settings:

```bash
# Configure security and domain
./configure-security-domain.sh --domain yourdomain.com --email admin@yourdomain.com --enable-auth --enable-waf
```

### Step 4: Validation & Testing
Validate the deployed application:

```bash
# Validate deployment
./validate-deployment.sh --domain yourdomain.com --full-test-suite
```

## Accessing the Application

Once deployed, the Summit application will be accessible at:

- **Web Interface**: `https://yourdomain.com`
- **API Endpoint**: `https://yourdomain.com/api`
- **GraphQL**: `https://yourdomain.com/graphql`

## Security Features Implemented

1. **SSL/TLS Encryption**: All traffic encrypted with Let's Encrypt certificates
2. **Network Policies**: Isolated service communication
3. **RBAC**: Role-based access control for Kubernetes resources
4. **Secure Secrets**: Encrypted storage of sensitive information
5. **Authentication**: Optional OIDC integration
6. **WAF Protection**: Web Application Firewall (if enabled)

## Monitoring and Maintenance

### Resource Monitoring
```bash
# Check resource usage
kubectl top nodes,pods -n summit-app

# View logs
kubectl logs -f deployment/summit-server -n summit-app
```

### Scaling
```bash
# Scale services based on demand
kubectl scale deployment summit-server -n summit-app --replicas=3
kubectl scale deployment summit-web -n summit-app --replicas=3
```

### Backups
The application includes a backup service for disaster recovery. Configure it with your cloud storage:

```bash
kubectl create secret generic backup-credentials -n summit-app \
  --from-literal=AWS_ACCESS_KEY_ID=your_key \
  --from-literal=AWS_SECRET_ACCESS_KEY=your_secret \
  --from-literal=S3_BUCKET=your_bucket
```

## Troubleshooting

### Common Issues
1. **Pods not starting**: Check logs and resource limits
2. **Database connectivity**: Verify connection strings and network policies
3. **SSL/TLS issues**: Ensure certificates are properly configured
4. **Performance issues**: Monitor resource usage and scale as needed

### Useful Commands
```bash
# Describe a pod for detailed information
kubectl describe pod <pod-name> -n summit-app

# Exec into a container for debugging
kubectl exec -it <pod-name> -n summit-app -- /bin/sh

# Port forward for local testing
kubectl port-forward service/summit-server 4000:4000 -n summit-app
```

## Cost Optimization

1. **Resource Requests/Limits**: Properly configured in deployment manifests
2. **Auto-scaling**: Implement HPA based on metrics
3. **Storage**: Appropriate storage classes and retention policies
4. **Monitoring**: Track costs and optimize resource usage

## Conclusion

The Summit application has been successfully prepared for cloud deployment with:

- ✅ Complete infrastructure setup scripts
- ✅ Kubernetes deployment configurations
- ✅ Security and SSL certificate management
- ✅ Domain configuration
- ✅ Comprehensive validation and testing tools
- ✅ Documentation and operational guides

The application is now ready to be deployed to your chosen cloud provider following the steps outlined in this guide.