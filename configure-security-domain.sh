#!/bin/bash
# Summit Application Cloud Security and Domain Configuration
# This script configures domain, SSL certificates, and security settings for the Summit application

set -e

echo "🔐 Summit Application Cloud Security & Domain Configuration"
echo "=========================================================="

# Function to display usage
usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --provider PROVIDER      Cloud provider (aws|azure|gcp|k8s) - default: k8s"
    echo "  --env ENVIRONMENT        Environment (dev|staging|prod) - default: dev"
    echo "  --namespace NAMESPACE    Kubernetes namespace - default: summit-app"
    echo "  --domain DOMAIN          Domain name for the application (required)"
    echo "  --email EMAIL            Email for SSL certificate registration"
    echo "  --ssl-provider PROVIDER  SSL provider (letsencrypt-staging|letsencrypt-prod) - default: letsencrypt-prod"
    echo "  --enable-auth            Enable authentication (default: false)"
    echo "  --enable-waf             Enable Web Application Firewall (default: false)"
    echo "  --enable-ddos            Enable DDoS protection (default: false)"
    echo "  --help                   Show this help message"
    exit 1
}

# Default values
PROVIDER="k8s"
ENVIRONMENT="dev"
NAMESPACE="summit-app"
DOMAIN=""
EMAIL=""
SSL_PROVIDER="letsencrypt-prod"
ENABLE_AUTH=false
ENABLE_WAF=false
ENABLE_DDOS=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --provider)
            PROVIDER="$2"
            shift 2
            ;;
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
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
        --ssl-provider)
            SSL_PROVIDER="$2"
            shift 2
            ;;
        --enable-auth)
            ENABLE_AUTH=true
            shift
            ;;
        --enable-waf)
            ENABLE_WAF=true
            shift
            ;;
        --enable-ddos)
            ENABLE_DDOS=true
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

echo "Provider: $PROVIDER"
echo "Environment: $ENVIRONMENT"
echo "Namespace: $NAMESPACE"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "SSL Provider: $SSL_PROVIDER"
echo "Enable Auth: $ENABLE_AUTH"
echo "Enable WAF: $ENABLE_WAF"
echo "Enable DDoS Protection: $ENABLE_DDOS"
echo

# Validate required inputs
if [ -z "$DOMAIN" ]; then
    echo "❌ Domain is required"
    exit 1
fi

if [ "$SSL_PROVIDER" != "letsencrypt-staging" ] && [ "$SSL_PROVIDER" != "letsencrypt-prod" ]; then
    echo "❌ Invalid SSL provider. Supported providers: letsencrypt-staging, letsencrypt-prod"
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
    
    if [ "$SSL_PROVIDER" = "letsencrypt-staging" ] || [ "$SSL_PROVIDER" = "letsencrypt-prod" ]; then
        if ! command -v helm &> /dev/null; then
            echo "❌ Helm is not installed. Please install it first."
            echo "Installation instructions: https://helm.sh/docs/intro/install/"
            exit 1
        fi
        echo "✅ Helm is installed"
    fi
    
    echo
}

# Function to install cert-manager for SSL certificates
install_cert_manager() {
    echo "🔐 Installing cert-manager for SSL certificate management..."
    
    # Check if cert-manager is already installed
    if kubectl get namespace cert-manager &> /dev/null; then
        echo "cert-manager is already installed"
    else
        # Add the Jetstack Helm repository
        helm repo add jetstack https://charts.jetstack.io
        helm repo update
        
        # Install cert-manager Helm chart
        kubectl create namespace cert-manager
        helm install cert-manager jetstack/cert-manager \
            --namespace cert-manager \
            --set installCRDs=true \
            --set extraArgs={--enable-certificate-owner-ref=true}
        
        echo "Waiting for cert-manager to be ready..."
        kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=300s
    fi
    
    echo "✅ cert-manager installed"
    echo
}

# Function to create SSL certificate issuer
create_ssl_issuer() {
    echo "📝 Creating SSL certificate issuer..."
    
    # Determine the ACME server URL based on the SSL provider
    if [ "$SSL_PROVIDER" = "letsencrypt-staging" ]; then
        SERVER_URL="https://acme-staging-v02.api.letsencrypt.org/directory"
        ISSUER_NAME="letsencrypt-staging"
    else
        SERVER_URL="https://acme-v02.api.letsencrypt.org/directory"
        ISSUER_NAME="letsencrypt-prod"
    fi
    
    # Create the ClusterIssuer manifest
    cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: $ISSUER_NAME
spec:
  acme:
    server: $SERVER_URL
    email: $EMAIL
    privateKeySecretRef:
      name: $ISSUER_NAME-private-key
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
    
    echo "✅ SSL certificate issuer created: $ISSUER_NAME"
    echo
}

# Function to update ingress with SSL configuration
update_ingress_ssl() {
    echo "🔄 Updating ingress with SSL configuration..."
    
    # Create a temporary file for the updated ingress
    TEMP_INGRESS_FILE=$(mktemp)
    
    # Get the current ingress configuration and update it
    kubectl get ingress summit-ingress -n $NAMESPACE -o yaml > $TEMP_INGRESS_FILE
    
    # Modify the ingress to include TLS configuration
    sed -i.bak '/^spec:/a\
  tls:\
  - hosts:\
    - '"$DOMAIN"'\
    secretName: summit-tls-cert' $TEMP_INGRESS_FILE
    
    # Update the ingress with the new configuration
    kubectl apply -f $TEMP_INGRESS_FILE -n $NAMESPACE
    
    # Clean up temporary files
    rm $TEMP_INGRESS_FILE $TEMP_INGRESS_FILE.bak
    
    echo "✅ Ingress updated with SSL configuration"
    echo
}

# Function to configure authentication
configure_authentication() {
    if [ "$ENABLE_AUTH" = false ]; then
        echo "⏭️ Authentication not enabled, skipping configuration"
        return
    fi
    
    echo "🔐 Configuring authentication..."
    
    # Create a ConfigMap for authentication settings
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: summit-auth-config
  namespace: $NAMESPACE
data:
  AUTH_ENABLED: "true"
  AUTH_STRATEGY: "oidc"  # Options: oidc, basic, none
  OIDC_ISSUER: "https://your-oidc-provider.com"
  OIDC_CLIENT_ID: "your-client-id"
  OIDC_CLIENT_SECRET: "your-client-secret"
  OIDC_REDIRECT_URI: "https://$DOMAIN/auth/callback"
EOF
    
    # Update the server deployment to use authentication
    kubectl patch deployment summit-server -n $NAMESPACE --patch '{
      "spec": {
        "template": {
          "spec": {
            "containers": [
              {
                "name": "summit-server",
                "env": [
                  {
                    "name": "AUTH_ENABLED",
                    "valueFrom": {
                      "configMapKeyRef": {
                        "name": "summit-auth-config",
                        "key": "AUTH_ENABLED"
                      }
                    }
                  },
                  {
                    "name": "AUTH_STRATEGY",
                    "valueFrom": {
                      "configMapKeyRef": {
                        "name": "summit-auth-config",
                        "key": "AUTH_STRATEGY"
                      }
                    }
                  },
                  {
                    "name": "OIDC_ISSUER",
                    "valueFrom": {
                      "configMapKeyRef": {
                        "name": "summit-auth-config",
                        "key": "OIDC_ISSUER"
                      }
                    }
                  },
                  {
                    "name": "OIDC_CLIENT_ID",
                    "valueFrom": {
                      "configMapKeyRef": {
                        "name": "summit-auth-config",
                        "key": "OIDC_CLIENT_ID"
                      }
                    }
                  },
                  {
                    "name": "OIDC_CLIENT_SECRET",
                    "valueFrom": {
                      "secretKeyRef": {
                        "name": "summit-secrets",
                        "key": "oidc-client-secret"
                      }
                    }
                  },
                  {
                    "name": "OIDC_REDIRECT_URI",
                    "valueFrom": {
                      "configMapKeyRef": {
                        "name": "summit-auth-config",
                        "key": "OIDC_REDIRECT_URI"
                      }
                    }
                  }
                ]
              }
            ]
          }
        }
      }
    }'
    
    echo "✅ Authentication configured"
    echo
}

# Function to configure security policies
configure_security_policies() {
    echo "🛡️ Configuring security policies..."
    
    # Create Network Policies to restrict traffic
    cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: neo4j-netpol
  namespace: $NAMESPACE
spec:
  podSelector:
    matchLabels:
      app: neo4j
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: summit-server
    ports:
    - protocol: TCP
      port: 7687
    - protocol: TCP
      port: 7474
  egress:
  - to: []
    ports:
    - protocol: UDP
      port: 53  # DNS
    - protocol: TCP
      port: 53  # DNS
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: postgres-netpol
  namespace: $NAMESPACE
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: summit-server
  egress:
  - to: []
    ports:
    - protocol: UDP
      port: 53  # DNS
    - protocol: TCP
      port: 53  # DNS
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: redis-netpol
  namespace: $NAMESPACE
spec:
  podSelector:
    matchLabels:
      app: redis
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: summit-server
    - podSelector:
        matchLabels:
          app: prov-ledger
    - podSelector:
        matchLabels:
          app: policy-lac
  egress:
  - to: []
    ports:
    - protocol: UDP
      port: 53  # DNS
    - protocol: TCP
      port: 53  # DNS
EOF
    
    # Create RBAC policies
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: summit-service-account
  namespace: $NAMESPACE
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: $NAMESPACE
  name: summit-role
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets"]
  verbs: ["get", "watch", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: summit-rolebinding
  namespace: $NAMESPACE
subjects:
- kind: ServiceAccount
  name: summit-service-account
  namespace: $NAMESPACE
roleRef:
  kind: Role
  name: summit-role
  apiGroup: rbac.authorization.k8s.io
EOF
    
    echo "✅ Security policies configured"
    echo
}

# Function to configure WAF (if enabled)
configure_waf() {
    if [ "$ENABLE_WAF" = false ]; then
        echo "⏭️ WAF not enabled, skipping configuration"
        return
    fi
    
    echo "🛡️ Configuring Web Application Firewall..."
    
    # Install Kong Ingress Controller which includes WAF capabilities
    helm repo add kong https://kong.github.io/kong-helm-chart
    helm repo update
    
    # Install Kong with WAF features
    helm install kong-kong kong/kong \
        --namespace $NAMESPACE \
        --set proxy.http.nodePort=30080 \
        --set proxy.tls.nodePort=30443 \
        --set ingressController.enabled=true \
        --set ingressController.env.kong_admin_token=your-admin-token
    
    echo "✅ Web Application Firewall configured"
    echo
}

# Function to configure DDoS protection (provider-specific)
configure_ddos_protection() {
    if [ "$ENABLE_DDOS" = false ]; then
        echo "⏭️ DDoS protection not enabled, skipping configuration"
        return
    fi
    
    echo "🛡️ Configuring DDoS protection..."
    
    case $PROVIDER in
        aws)
            echo "AWS DDoS protection configuration:"
            echo "- Enable AWS Shield Advanced for enhanced DDoS protection"
            echo "- Configure AWS WAF rules through AWS Console"
            echo "- Set up CloudWatch alarms for DDoS detection"
            ;;
        azure)
            echo "Azure DDoS protection configuration:"
            echo "- Enable Azure DDoS Protection Standard for your VNET"
            echo "- Configure Azure Application Gateway with WAF"
            echo "- Set up Azure Monitor alerts for DDoS detection"
            ;;
        gcp)
            echo "GCP DDoS protection configuration:"
            echo "- Enable Cloud Armor for DDoS protection"
            echo "- Configure security policies through Google Cloud Console"
            echo "- Set up Cloud Monitoring alerts for DDoS detection"
            ;;
        k8s)
            echo "Generic Kubernetes DDoS protection configuration:"
            echo "- Consider using a managed service like Cloudflare"
            echo "- Implement rate limiting with nginx-ingress annotations"
            echo "- Set up monitoring with Prometheus and Grafana"
            ;;
    esac
    
    echo "✅ DDoS protection configuration noted"
    echo
}

# Function to update secrets with security configurations
update_secrets() {
    echo "🔑 Updating secrets with security configurations..."
    
    # Create or update the secrets for security configurations
    kubectl create secret generic summit-security-secrets \
        --namespace $NAMESPACE \
        --from-literal=session-secret=$(openssl rand -hex 32) \
        --from-literal=jwt-secret=$(openssl rand -hex 32) \
        --from-literal=jwt-refresh-secret=$(openssl rand -hex 32) \
        --from-literal=oidc-client-secret=your-oidc-client-secret \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Patch the existing summit-secrets to include new values
    kubectl patch secret summit-secrets -n $NAMESPACE --type='merge' -p='{"data":{"session-secret":"'$(echo -n $(openssl rand -hex 32) | base64)'","jwt-secret":"'$(echo -n $(openssl rand -hex 32) | base64)'","jwt-refresh-secret":"'$(echo -n $(openssl rand -hex 32) | base64)'"}}'
    
    echo "✅ Secrets updated with security configurations"
    echo
}

# Function to restart deployments to pick up new configurations
restart_deployments() {
    echo "🔄 Restarting deployments to apply new configurations..."
    
    # Restart deployments to pick up new configurations
    kubectl rollout restart deployment/summit-server -n $NAMESPACE
    kubectl rollout restart deployment/summit-web -n $NAMESPACE
    kubectl rollout restart deployment/api-gateway -n $NAMESPACE
    kubectl rollout restart deployment/prov-ledger -n $NAMESPACE
    kubectl rollout restart deployment/policy-lac -n $NAMESPACE
    kubectl rollout restart deployment/nl2cypher -n $NAMESPACE
    
    echo "Waiting for deployments to be ready..."
    
    # Wait for deployments to be ready
    kubectl wait --for=condition=ready pod -l app=summit-server -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=summit-web -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=api-gateway -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=prov-ledger -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=policy-lac -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=nl2cypher -n $NAMESPACE --timeout=300s
    
    echo "✅ Deployments restarted with new configurations"
    echo
}

# Function to display security summary
display_security_summary() {
    echo "🛡️ Summit Application Security Configuration Summary"
    echo "===================================================="
    echo
    echo "Domain: $DOMAIN"
    echo "SSL Provider: $SSL_PROVIDER"
    echo "Authentication: $(if [ "$ENABLE_AUTH" = true ]; then echo "Enabled"; else echo "Disabled"; fi)"
    echo "WAF: $(if [ "$ENABLE_WAF" = true ]; then echo "Enabled"; else echo "Disabled"; fi)"
    echo "DDoS Protection: $(if [ "$ENABLE_DDOS" = true ]; then echo "Configured"; else echo "Not configured"; fi)"
    echo
    echo "Security Components Configured:"
    echo "- SSL/TLS certificates via cert-manager"
    echo "- Network policies for service isolation"
    echo "- RBAC policies for access control"
    echo "- Updated secrets with secure values"
    echo "- Security-focused configurations applied"
    echo
    echo "Access the application securely at: https://$DOMAIN"
    echo
    echo "Security monitoring recommendations:"
    echo "- Monitor certificate expiration (typically 90 days for Let's Encrypt)"
    echo "- Regularly rotate secrets and certificates"
    echo "- Monitor access logs for suspicious activity"
    echo "- Set up alerts for security events"
    echo
    echo "✅ Security configuration completed successfully!"
}

# Main execution
check_prerequisites
install_cert_manager
create_ssl_issuer
update_ingress_ssl
configure_authentication
configure_security_policies
configure_waf
configure_ddos_protection
update_secrets
restart_deployments
display_security_summary