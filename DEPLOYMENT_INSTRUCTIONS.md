# Summit Application Deployment Instructions for topicality.co

## Current Status
The Summit application is ready for deployment, but requires a Kubernetes cluster to run on.

## Prerequisites
Before deploying Summit to topicality.co, you'll need:

1. A Kubernetes cluster (on AWS EKS, Azure AKS, Google GKE, or other provider)
2. kubectl configured to connect to your cluster
3. A domain (topicality.co) pointing to your cluster's load balancer

## Deployment Steps

### Option 1: Using Cloud Providers (Recommended)

#### For AWS EKS:
1. Create an EKS cluster:
   ```bash
   aws eks create-cluster --name summit-cluster --role-arn <role-arn> --resources-vpc-config subnetIds=<subnet-ids>
   aws eks update-kubeconfig --name summit-cluster
   ```

#### For Azure AKS:
1. Create an AKS cluster:
   ```bash
   az aks create --resource-group myResourceGroup --name summit-cluster --node-count 2
   az aks get-credentials --resource-group myResourceGroup --name summit-cluster
   ```

#### For Google GKE:
1. Create a GKE cluster:
   ```bash
   gcloud container clusters create summit-cluster --num-nodes=2
   gcloud container clusters get-credentials summit-cluster
   ```

### Option 2: Local Development Setup
If you want to run locally first:
1. Install Minikube or Kind:
   ```bash
   # For Minikube
   minikube start
   
   # For Kind
   kind create cluster
   ```

### After Setting Up Your Cluster
Once you have a Kubernetes cluster running and kubectl configured:

1. Run the deployment script:
   ```bash
   ./deploy-simple.sh
   ```

2. Wait for all services to be deployed:
   ```bash
   kubectl get pods -n summit-app
   ```

3. Get the external IP of the ingress controller:
   ```bash
   kubectl get svc -n ingress-nginx
   ```

4. Point your domain (topicality.co) to the external IP address

5. Wait for DNS propagation and SSL certificate issuance (may take 5-10 minutes)

## Expected Outcome
After successful deployment, your Summit application will be available at:
- Web Interface: https://topicality.co
- API Endpoint: https://topicality.co/api
- GraphQL: https://topicality.co/graphql

## Important Notes
- SSL certificates will be automatically provisioned via Let's Encrypt
- The application includes Neo4j, PostgreSQL, and Redis databases
- Default passwords are used for initial setup (should be changed in production)
- The system will automatically scale based on demand

## Next Steps
1. Set up your Kubernetes cluster using one of the options above
2. Configure kubectl to connect to your cluster
3. Run the deployment script
4. Configure your DNS to point to the cluster's load balancer