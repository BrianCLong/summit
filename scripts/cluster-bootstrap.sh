#!/usr/bin/env bash
set -e

echo "🚀 Bootstrapping Summit EKS Cluster..."

# 1. Install Metrics Server (Required for HPA and 'kubectl top')
echo "📊 Installing Metrics Server..."
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
helm repo update
helm upgrade --install metrics-server metrics-server/metrics-server \
  --namespace kube-system \
  --set args={--kubelet-insecure-tls}

# 2. Install NGINX Ingress Controller (The Entrypoint)
echo "🌐 Installing NGINX Ingress Controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.service.annotations."service.beta.kubernetes.io/aws-load-balancer-type"="nlb"

# 3. Install Cert-Manager (For HTTPS)
echo "🔒 Installing Cert-Manager..."
helm repo add jetstack https://charts.jetstack.io
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --version v1.13.3 \
  --set installCRDs=true

# 4. Create ClusterIssuer (Let's Encrypt Production)
echo "📜 Configuring Let's Encrypt ClusterIssuer..."
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@summit-platform.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# 5. Apply Security, Resource, & Alerting Policies
echo "🛡️ Applying Security, Resource, & Alerting Policies..."
kubectl apply -f k8s/network-policies.yaml
kubectl apply -f k8s/resource-quotas.yaml
kubectl apply -f k8s/prometheus-rules.yaml
kubectl apply -f k8s/neo4j-backup-job.yaml

echo "✅ Cluster Bootstrap Complete!"
echo "   - Metrics Server: Installed"
echo "   - Ingress Controller: Installed (Check ELB in AWS Console)"
echo "   - Cert Manager: Installed & Configured"
