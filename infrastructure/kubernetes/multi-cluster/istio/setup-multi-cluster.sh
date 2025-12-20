#!/bin/bash
# Setup Multi-Cluster Istio Mesh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Cluster contexts
EKS_CONTEXT="eks-primary"
AKS_CONTEXT="aks-primary"
GKE_CONTEXT="gke-primary"

echo -e "${GREEN}Setting up multi-cluster Istio mesh...${NC}"

# Create istio-system namespace on all clusters
for CTX in $EKS_CONTEXT $AKS_CONTEXT $GKE_CONTEXT; do
  echo -e "${YELLOW}Creating istio-system namespace on $CTX${NC}"
  kubectl create namespace istio-system --context=$CTX --dry-run=client -o yaml | kubectl apply --context=$CTX -f -
done

# Create root certificates for mTLS
echo -e "${YELLOW}Creating root certificates...${NC}"
mkdir -p certs
pushd certs

# Generate root CA
if [ ! -f root-cert.pem ]; then
  make -f ../tools/certs/Makefile.selfsigned.mk root-ca
fi

# Generate intermediate certificates for each cluster
for CLUSTER in eks aks gke; do
  if [ ! -f ${CLUSTER}/cert-chain.pem ]; then
    make -f ../tools/certs/Makefile.selfsigned.mk ${CLUSTER}-cacerts
  fi
done

popd

# Create secrets with certificates on each cluster
echo -e "${YELLOW}Creating certificate secrets...${NC}"
kubectl create secret generic cacerts -n istio-system \
  --from-file=certs/eks/ca-cert.pem \
  --from-file=certs/eks/ca-key.pem \
  --from-file=certs/eks/root-cert.pem \
  --from-file=certs/eks/cert-chain.pem \
  --context=$EKS_CONTEXT --dry-run=client -o yaml | kubectl apply --context=$EKS_CONTEXT -f -

kubectl create secret generic cacerts -n istio-system \
  --from-file=certs/aks/ca-cert.pem \
  --from-file=certs/aks/ca-key.pem \
  --from-file=certs/aks/root-cert.pem \
  --from-file=certs/aks/cert-chain.pem \
  --context=$AKS_CONTEXT --dry-run=client -o yaml | kubectl apply --context=$AKS_CONTEXT -f -

kubectl create secret generic cacerts -n istio-system \
  --from-file=certs/gke/ca-cert.pem \
  --from-file=certs/gke/ca-key.pem \
  --from-file=certs/gke/root-cert.pem \
  --from-file=certs/gke/cert-chain.pem \
  --context=$GKE_CONTEXT --dry-run=client -o yaml | kubectl apply --context=$GKE_CONTEXT -f -

# Install Istio on primary cluster (EKS)
echo -e "${YELLOW}Installing Istio on primary cluster (EKS)...${NC}"
istioctl install -f primary-cluster.yaml --context=$EKS_CONTEXT -y

# Install Istio on secondary clusters
echo -e "${YELLOW}Installing Istio on AKS...${NC}"
cat secondary-cluster.yaml | \
  sed 's/clusterName: secondary-cluster/clusterName: aks-primary/' | \
  sed 's/network: network2/network: network2/' | \
  istioctl install --context=$AKS_CONTEXT -f - -y

echo -e "${YELLOW}Installing Istio on GKE...${NC}"
cat secondary-cluster.yaml | \
  sed 's/clusterName: secondary-cluster/clusterName: gke-primary/' | \
  sed 's/network: network2/network: network3/' | \
  sed 's/topology.istio.io\/network: network2/topology.istio.io\/network: network3/' | \
  sed 's/ISTIO_META_REQUESTED_NETWORK_VIEW.*network2/ISTIO_META_REQUESTED_NETWORK_VIEW: network3/' | \
  istioctl install --context=$GKE_CONTEXT -f - -y

# Enable endpoint discovery between clusters
echo -e "${YELLOW}Setting up cross-cluster endpoint discovery...${NC}"

# Create remote secrets for each cluster
istioctl create-remote-secret \
  --context=$EKS_CONTEXT \
  --name=eks-primary | \
  kubectl apply -f - --context=$AKS_CONTEXT

istioctl create-remote-secret \
  --context=$EKS_CONTEXT \
  --name=eks-primary | \
  kubectl apply -f - --context=$GKE_CONTEXT

istioctl create-remote-secret \
  --context=$AKS_CONTEXT \
  --name=aks-primary | \
  kubectl apply -f - --context=$EKS_CONTEXT

istioctl create-remote-secret \
  --context=$AKS_CONTEXT \
  --name=aks-primary | \
  kubectl apply -f - --context=$GKE_CONTEXT

istioctl create-remote-secret \
  --context=$GKE_CONTEXT \
  --name=gke-primary | \
  kubectl apply -f - --context=$EKS_CONTEXT

istioctl create-remote-secret \
  --context=$GKE_CONTEXT \
  --name=gke-primary | \
  kubectl apply -f - --context=$AKS_CONTEXT

# Expose services via east-west gateway
echo -e "${YELLOW}Configuring east-west gateways...${NC}"
kubectl apply -f - <<EOF --context=$EKS_CONTEXT
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: cross-network-gateway
  namespace: istio-system
spec:
  selector:
    istio: eastwestgateway
  servers:
  - port:
      number: 15443
      name: tls
      protocol: TLS
    tls:
      mode: AUTO_PASSTHROUGH
    hosts:
    - "*.local"
EOF

kubectl apply -f - <<EOF --context=$AKS_CONTEXT
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: cross-network-gateway
  namespace: istio-system
spec:
  selector:
    istio: eastwestgateway
  servers:
  - port:
      number: 15443
      name: tls
      protocol: TLS
    tls:
      mode: AUTO_PASSTHROUGH
    hosts:
    - "*.local"
EOF

kubectl apply -f - <<EOF --context=$GKE_CONTEXT
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: cross-network-gateway
  namespace: istio-system
spec:
  selector:
    istio: eastwestgateway
  servers:
  - port:
      number: 15443
      name: tls
      protocol: TLS
    tls:
      mode: AUTO_PASSTHROUGH
    hosts:
    - "*.local"
EOF

# Verify installation
echo -e "${YELLOW}Verifying installation...${NC}"
for CTX in $EKS_CONTEXT $AKS_CONTEXT $GKE_CONTEXT; do
  echo -e "${GREEN}Checking $CTX:${NC}"
  kubectl get pods -n istio-system --context=$CTX
done

echo -e "${GREEN}Multi-cluster setup complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Deploy your applications with sidecar injection enabled"
echo "2. Configure cross-cluster traffic policies"
echo "3. Set up observability tools (Prometheus, Grafana, Jaeger)"
