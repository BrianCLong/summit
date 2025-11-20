# Multi-Cluster Kubernetes Configuration

This directory contains Kubernetes configurations for multi-cluster deployment across AWS EKS, Azure AKS, and GCP GKE.

## Structure

- `istio/` - Istio service mesh configuration for multi-cluster
- `configs/` - Kubernetes resource definitions
- `policies/` - Network policies and RBAC configurations

## Setup

### Prerequisites

1. Install required tools:
```bash
# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# istioctl
curl -L https://istio.io/downloadIstio | sh -

# helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

2. Configure kubectl contexts for each cluster:
```bash
# AWS EKS
aws eks update-kubeconfig --name summit-production-eks --region us-east-1 --alias eks-primary

# Azure AKS
az aks get-credentials --name summit-production-aks --resource-group summit-production-rg --context aks-primary

# GCP GKE
gcloud container clusters get-credentials summit-production-gke --region us-central1 --context gke-primary
```

### Deploy Istio Multi-Cluster

```bash
# Install Istio on primary cluster (EKS)
kubectl config use-context eks-primary
istioctl install -f istio/primary-cluster.yaml

# Install Istio on secondary clusters
kubectl config use-context aks-primary
istioctl install -f istio/secondary-cluster.yaml

kubectl config use-context gke-primary
istioctl install -f istio/secondary-cluster.yaml

# Setup cross-cluster connectivity
./istio/setup-multi-cluster.sh
```

### Deploy Application

```bash
# Deploy to all clusters
kubectl apply -f configs/namespace.yaml --context eks-primary
kubectl apply -f configs/namespace.yaml --context aks-primary
kubectl apply -f configs/namespace.yaml --context gke-primary

kubectl apply -f configs/summit-app.yaml --context eks-primary
kubectl apply -f configs/summit-app.yaml --context aks-primary
kubectl apply -f configs/summit-app.yaml --context gke-primary
```

## Multi-Cluster Service Mesh

The Istio service mesh provides:

- Unified service discovery across clouds
- Cross-cluster load balancing
- Mutual TLS between services
- Traffic management and routing
- Observability and monitoring

## Security

- Network policies restrict pod-to-pod communication
- RBAC policies enforce least privilege
- Pod security standards enforced
- Secrets encrypted at rest and in transit
