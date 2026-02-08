# Summit Application - Cloud Deployment Guide

## Overview

This document provides instructions for deploying the Summit application to cloud platforms. The Summit application is a comprehensive intelligence analysis platform with AI-augmented graph analytics capabilities.

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

## Cloud Deployment Options

The Summit application can be deployed to various cloud platforms:

1. **Amazon Web Services (AWS)**: Using EKS for Kubernetes orchestration
2. **Microsoft Azure**: Using AKS for Kubernetes orchestration
3. **Google Cloud Platform (GCP)**: Using GKE for Kubernetes orchestration
4. **Generic Kubernetes**: Using any Kubernetes cluster

## Prerequisites

Before deploying to the cloud, ensure you have:

1. **Cloud Account**: Valid account with your chosen cloud provider
2. **CLI Tools**: Installed and configured CLI tools for your cloud provider
   - AWS: `aws` CLI
   - Azure: `az` CLI
   - GCP: `gcloud` CLI
3. **Kubernetes CLI**: `kubectl` installed and configured
4. **Docker**: Docker installed and running
5. **pnpm**: Package manager for the application
6. **Domain Name**: (Optional) Registered domain name for the application

## Deployment Process

### 1. Prepare Your Environment

Set up your cloud provider CLI tools and authenticate:

```bash
# For AWS
aws configure

# For Azure
az login

# For GCP
gcloud auth login
```

### 2. Run the Deployment Script

Execute the deployment script with your chosen options:

```bash
# Deploy to AWS
./deploy-to-cloud.sh --provider aws --region us-west-2 --env prod --domain yourdomain.com

# Deploy to Azure
./deploy-to-cloud.sh --provider azure --region eastus --env prod --domain yourdomain.com

# Deploy to GCP
./deploy-to-cloud.sh --provider gcp --region us-central1 --env prod --domain yourdomain.com

# Deploy to generic Kubernetes
./deploy-to-cloud.sh --provider k8s --env prod --domain yourdomain.com
```

### 3. Monitor the Deployment

Monitor the deployment progress:

```bash
# Check pod status
kubectl get pods -n summit-app

# Check services
kubectl get services -n summit-app

# Check ingress
kubectl get ingress -n summit-app

# View logs
kubectl logs -l app=summit-server -n summit-app
```

### 4. Access the Application

Once deployed, access the application:

- Web Interface: `https://yourdomain.com` (or the load balancer IP)
- API Endpoint: `https://yourdomain.com/api`
- GraphQL: `https://yourdomain.com/graphql`

## Configuration

### Environment Variables

The application uses several environment variables that can be customized:

- `NODE_ENV`: Environment mode (development, production)
- `DATABASE_URL`: PostgreSQL connection string
- `NEO4J_URI`: Neo4j connection URI
- `REDIS_URL`: Redis connection URL
- `JWT_SECRET`: Secret for JWT tokens
- `JWT_REFRESH_SECRET`: Secret for refresh tokens
- `SESSION_SECRET`: Secret for session management
- `CORS_ORIGIN`: Allowed origins for CORS
- `ALLOWED_ORIGINS`: Additional allowed origins

### Secrets Management

Sensitive information like passwords and API keys are stored in Kubernetes secrets. Update them as needed:

```bash
kubectl edit secret summit-secrets -n summit-app
```

## Scaling

Scale individual services based on demand:

```bash
# Scale the server
kubectl scale deployment summit-server -n summit-app --replicas=3

# Scale the web client
kubectl scale deployment summit-web -n summit-app --replicas=3

# Scale databases (be cautious with stateful sets)
kubectl scale statefulset postgres -n summit-app --replicas=1  # Usually kept at 1 for simplicity
```

## Monitoring and Maintenance

### Resource Monitoring

Monitor resource usage:

```bash
# Check resource usage
kubectl top nodes -n summit-app
kubectl top pods -n summit-app

# Check logs
kubectl logs -f deployment/summit-server -n summit-app
kubectl logs -f deployment/summit-web -n summit-app
```

### Backups

The application includes a backup service for disaster recovery. Configure it with your cloud storage:

```bash
# Set backup credentials
kubectl create secret generic backup-credentials -n summit-app \
  --from-literal=AWS_ACCESS_KEY_ID=your_key \
  --from-literal=AWS_SECRET_ACCESS_KEY=your_secret \
  --from-literal=S3_BUCKET=your_bucket
```

### Updates

To update the application:

1. Build new Docker images
2. Push to your container registry
3. Update the deployment with new image tags
4. Roll out the update

```bash
# Update image in deployment
kubectl set image deployment/summit-server summit-server=new-image:tag -n summit-app

# Roll back if needed
kubectl rollout undo deployment/summit-server -n summit-app
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

## Security Considerations

1. **Network Policies**: Implement network policies to restrict traffic between services
2. **Secrets Management**: Use cloud-native secrets management solutions
3. **RBAC**: Implement role-based access control for Kubernetes resources
4. **TLS**: Ensure all traffic is encrypted with TLS
5. **Regular Updates**: Keep all components updated with security patches

## Cost Optimization

1. **Resource Requests/Limits**: Properly configure resource requests and limits
2. **Auto-scaling**: Implement horizontal pod autoscaling based on metrics
3. **Storage**: Use appropriate storage classes and retention policies
4. **Monitoring**: Monitor costs and optimize resource usage

## Conclusion

The Summit application is now deployed to your cloud environment. Follow the maintenance guidelines to ensure optimal performance and security.