#!/bin/bash
set -euo pipefail

# IntelGraph Monitoring Stack Setup Script
# Deploys comprehensive monitoring and observability for production

# Configuration
NAMESPACE="monitoring"
CLUSTER_NAME="${CLUSTER_NAME:-intelgraph-prod}"
DOMAIN="${DOMAIN:-intelgraph.ai}"
ENVIRONMENT="${ENVIRONMENT:-production}"
GRAFANA_ADMIN_PASSWORD="${GRAFANA_ADMIN_PASSWORD:-$(openssl rand -base64 32)}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
PAGERDUTY_SERVICE_KEY="${PAGERDUTY_SERVICE_KEY:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Prerequisites check
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check required tools
    local tools=("kubectl" "helm" "jq" "curl" "openssl")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is required but not installed"
            exit 1
        fi
    done
    
    # Check kubectl context
    local current_context=$(kubectl config current-context)
    log_info "Using kubectl context: $current_context"
    
    # Verify cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if running on correct cluster
    local cluster_name=$(kubectl config view --minify -o jsonpath='{.clusters[0].name}')
    if [[ "$cluster_name" != *"$CLUSTER_NAME"* ]] && [[ "$ENVIRONMENT" == "production" ]]; then
        log_warning "Cluster name doesn't match expected production cluster"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Create namespace and RBAC
setup_namespace() {
    log_info "Setting up namespace and RBAC..."
    
    # Create monitoring namespace
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    kubectl label namespace "$NAMESPACE" name="$NAMESPACE" --overwrite
    
    # Apply RBAC for monitoring components
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: monitoring-admin
  namespace: $NAMESPACE
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring-admin
rules:
  - apiGroups: [""]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["extensions"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["monitoring.coreos.com"]
    resources: ["*"]
    verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: monitoring-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: monitoring-admin
subjects:
  - kind: ServiceAccount
    name: monitoring-admin
    namespace: $NAMESPACE
EOF
    
    log_success "Namespace and RBAC configured"
}

# Setup secrets
setup_secrets() {
    log_info "Setting up secrets..."
    
    # Create Grafana admin password secret
    kubectl create secret generic grafana-admin-secret \
        --namespace="$NAMESPACE" \
        --from-literal=admin-password="$GRAFANA_ADMIN_PASSWORD" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Create alerting secrets if provided
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        kubectl create secret generic alerting-secrets \
            --namespace="$NAMESPACE" \
            --from-literal=slack-webhook-url="$SLACK_WEBHOOK_URL" \
            --from-literal=pagerduty-service-key="${PAGERDUTY_SERVICE_KEY:-}" \
            --dry-run=client -o yaml | kubectl apply -f -
    fi
    
    log_success "Secrets configured"
}

# Add Helm repositories
add_helm_repos() {
    log_info "Adding Helm repositories..."
    
    local repos=(
        "prometheus-community|https://prometheus-community.github.io/helm-charts"
        "grafana|https://grafana.github.io/helm-charts"
        "jaegertracing|https://jaegertracing.github.io/helm-charts"
    )
    
    for repo in "${repos[@]}"; do
        IFS='|' read -r name url <<< "$repo"
        log_info "Adding repository: $name"
        helm repo add "$name" "$url" || true
    done
    
    helm repo update
    log_success "Helm repositories added and updated"
}

# Deploy Prometheus stack
deploy_prometheus() {
    log_info "Deploying Prometheus stack..."
    
    # Create custom values for Prometheus
    cat > /tmp/prometheus-values.yaml <<EOF
prometheus:
  prometheusSpec:
    retention: 30d
    retentionSize: 100GB
    replicas: 2
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: gp3-ssd
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 150Gi
    resources:
      requests:
        memory: 4Gi
        cpu: 1000m
      limits:
        memory: 8Gi
        cpu: 4000m
    additionalScrapeConfigs:
      - job_name: 'maestro-orchestrator'
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names: ['default', 'maestro']
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_name]
            action: keep
            regex: maestro
          - source_labels: [__meta_kubernetes_pod_container_port_name]
            action: keep
            regex: metrics

alertmanager:
  alertmanagerSpec:
    replicas: 2
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: gp3-ssd
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 10Gi
  config:
    global:
      slack_api_url: '$SLACK_WEBHOOK_URL'
    route:
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 1h
      receiver: 'default'
      routes:
        - match:
            severity: critical
          receiver: 'critical-alerts'
          group_wait: 5s
          repeat_interval: 15m
    receivers:
      - name: 'default'
        slack_configs:
          - channel: '#intelgraph-alerts'
            title: 'IntelGraph Alert'
            text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}{{ end }}'
      - name: 'critical-alerts'
        slack_configs:
          - channel: '#intelgraph-critical'
            title: 'CRITICAL: IntelGraph Alert'
            text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}{{ end }}'
            send_resolved: true

grafana:
  enabled: false  # We'll deploy separately

kubeStateMetrics:
  enabled: true

nodeExporter:
  enabled: true

prometheusOperator:
  enabled: true
EOF
    
    helm upgrade --install prometheus-stack prometheus-community/kube-prometheus-stack \
        --namespace="$NAMESPACE" \
        --values=/tmp/prometheus-values.yaml \
        --set global.imageRegistry="" \
        --timeout=10m \
        --wait
    
    log_success "Prometheus stack deployed"
}

# Deploy Grafana
deploy_grafana() {
    log_info "Deploying Grafana..."
    
    cat > /tmp/grafana-values.yaml <<EOF
admin:
  existingSecret: grafana-admin-secret
  userKey: admin-user
  passwordKey: admin-password

persistence:
  enabled: true
  storageClassName: gp3-ssd
  size: 20Gi

resources:
  requests:
    memory: 1Gi
    cpu: 500m
  limits:
    memory: 2Gi
    cpu: 1000m

ingress:
  enabled: true
  ingressClassName: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - grafana.$DOMAIN
  tls:
    - secretName: grafana-tls
      hosts:
        - grafana.$DOMAIN

datasources:
  datasources.yaml:
    apiVersion: 1
    datasources:
      - name: Prometheus
        type: prometheus
        url: http://prometheus-stack-kube-prom-prometheus:9090
        access: proxy
        isDefault: true
        editable: false
      - name: Loki
        type: loki
        url: http://loki:3100
        access: proxy
        editable: false
      - name: Jaeger
        type: jaeger
        url: http://jaeger-query:16686
        access: proxy
        editable: false

dashboardProviders:
  dashboardproviders.yaml:
    apiVersion: 1
    providers:
      - name: 'intelgraph'
        orgId: 1
        folder: 'IntelGraph'
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards/intelgraph

grafana.ini:
  server:
    domain: grafana.$DOMAIN
    root_url: https://grafana.$DOMAIN
  security:
    admin_user: admin
  auth:
    disable_login_form: false
  auth.anonymous:
    enabled: false
EOF
    
    helm upgrade --install grafana grafana/grafana \
        --namespace="$NAMESPACE" \
        --values=/tmp/grafana-values.yaml \
        --timeout=10m \
        --wait
    
    log_success "Grafana deployed"
}

# Deploy Jaeger
deploy_jaeger() {
    log_info "Deploying Jaeger..."
    
    cat > /tmp/jaeger-values.yaml <<EOF
allInOne:
  enabled: true
  image: jaegertracing/all-in-one:1.51.0
  resources:
    requests:
      memory: 1Gi
      cpu: 500m
    limits:
      memory: 2Gi
      cpu: 1000m
  ingress:
    enabled: true
    ingressClassName: nginx
    annotations:
      cert-manager.io/cluster-issuer: letsencrypt-prod
      nginx.ingress.kubernetes.io/ssl-redirect: "true"
    hosts:
      - jaeger.$DOMAIN
    tls:
      - secretName: jaeger-tls
        hosts:
          - jaeger.$DOMAIN

agent:
  enabled: false

collector:
  enabled: false

query:
  enabled: false

storage:
  type: memory  # Use Elasticsearch in production
EOF
    
    helm upgrade --install jaeger jaegertracing/jaeger \
        --namespace="$NAMESPACE" \
        --values=/tmp/jaeger-values.yaml \
        --timeout=10m \
        --wait
    
    log_success "Jaeger deployed"
}

# Deploy Loki
deploy_loki() {
    log_info "Deploying Loki..."
    
    cat > /tmp/loki-values.yaml <<EOF
loki:
  auth_enabled: false
  storage:
    type: s3
    s3:
      s3: s3://intelgraph-loki-logs/loki
      region: us-west-2
  limits_config:
    retention_period: 168h
    ingestion_rate_mb: 16
    ingestion_burst_size_mb: 24

persistence:
  enabled: true
  storageClassName: gp3-ssd
  size: 50Gi

resources:
  requests:
    memory: 2Gi
    cpu: 1000m
  limits:
    memory: 4Gi
    cpu: 2000m
EOF
    
    helm upgrade --install loki grafana/loki \
        --namespace="$NAMESPACE" \
        --values=/tmp/loki-values.yaml \
        --timeout=10m \
        --wait
    
    log_success "Loki deployed"
}

# Deploy Promtail
deploy_promtail() {
    log_info "Deploying Promtail..."
    
    cat > /tmp/promtail-values.yaml <<EOF
config:
  clients:
    - url: http://loki:3100/loki/api/v1/push
  
  scrape_configs:
    - job_name: kubernetes-pods
      kubernetes_sd_configs:
        - role: pod
      relabel_configs:
        - source_labels:
            - __meta_kubernetes_pod_controller_name
          regex: ([0-9a-z-.]+?)(-[0-9a-f]{8,10})?
          action: replace
          target_label: __tmp_controller_name
        - source_labels:
            - __meta_kubernetes_pod_label_app_kubernetes_io_name
            - __meta_kubernetes_pod_label_app
            - __tmp_controller_name
            - __meta_kubernetes_pod_name
          regex: ^;*([^;]+)(;.*)?$
          action: replace
          target_label: app
        - source_labels:
            - __meta_kubernetes_pod_node_name
          target_label: node_name
        - source_labels:
            - __meta_kubernetes_namespace
          target_label: namespace
        - source_labels:
            - __meta_kubernetes_pod_name
          target_label: pod
        - source_labels:
            - __meta_kubernetes_pod_container_name
          target_label: container

daemonset:
  enabled: true

resources:
  requests:
    memory: 128Mi
    cpu: 100m
  limits:
    memory: 256Mi
    cpu: 200m
EOF
    
    helm upgrade --install promtail grafana/promtail \
        --namespace="$NAMESPACE" \
        --values=/tmp/promtail-values.yaml \
        --timeout=10m \
        --wait
    
    log_success "Promtail deployed"
}

# Deploy custom alert rules
deploy_alert_rules() {
    log_info "Deploying custom alert rules..."
    
    kubectl apply -f "$(dirname "$0")/../charts/monitoring/alerts/prometheus-rules.yaml"
    
    log_success "Alert rules deployed"
}

# Deploy OpenTelemetry Collector
deploy_otel_collector() {
    log_info "Deploying OpenTelemetry Collector..."
    
    kubectl apply -f "$(dirname "$0")/../deploy/monitoring-stack.yml"
    
    # Wait for OTel Collector to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/otel-collector -n "$NAMESPACE"
    
    log_success "OpenTelemetry Collector deployed"
}

# Import Grafana dashboards
import_dashboards() {
    log_info "Importing Grafana dashboards..."
    
    # Wait for Grafana to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/grafana -n "$NAMESPACE"
    
    # Get Grafana admin password
    local grafana_password=$(kubectl get secret grafana-admin-secret -n "$NAMESPACE" -o jsonpath="{.data.admin-password}" | base64 --decode)
    
    # Port-forward to Grafana
    kubectl port-forward -n "$NAMESPACE" svc/grafana 3000:80 &
    local port_forward_pid=$!
    
    sleep 10
    
    # Import dashboards
    local dashboard_files=(
        "$(dirname "$0")/../charts/monitoring/dashboards/intelgraph-overview.json"
        "$(dirname "$0")/../charts/monitoring/dashboards/maestro-orchestration.json"
        "$(dirname "$0")/../charts/monitoring/dashboards/kubernetes-infrastructure.json"
    )
    
    for dashboard_file in "${dashboard_files[@]}"; do
        if [[ -f "$dashboard_file" ]]; then
            log_info "Importing dashboard: $(basename "$dashboard_file")"
            curl -X POST \
                -H "Content-Type: application/json" \
                -u "admin:$grafana_password" \
                -d @"$dashboard_file" \
                http://localhost:3000/api/dashboards/db
        fi
    done
    
    # Kill port-forward
    kill $port_forward_pid || true
    
    log_success "Grafana dashboards imported"
}

# Validate deployment
validate_deployment() {
    log_info "Validating deployment..."
    
    # Check all pods are running
    local components=(
        "prometheus-stack-kube-prom-prometheus"
        "prometheus-stack-kube-state-metrics"
        "prometheus-stack-prometheus-node-exporter"
        "grafana"
        "jaeger"
        "loki"
        "promtail"
        "otel-collector"
    )
    
    for component in "${components[@]}"; do
        if kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name="$component" &> /dev/null; then
            local ready_pods=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name="$component" --no-headers | grep -c "Running\|Completed" || echo "0")
            local total_pods=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name="$component" --no-headers | wc -l)
            
            if [[ "$ready_pods" -eq "$total_pods" ]] && [[ "$total_pods" -gt 0 ]]; then
                log_success "$component: $ready_pods/$total_pods pods ready"
            else
                log_warning "$component: $ready_pods/$total_pods pods ready"
            fi
        else
            log_warning "$component: No pods found"
        fi
    done
    
    # Test connectivity
    log_info "Testing service connectivity..."
    
    # Test Prometheus
    if kubectl exec -n "$NAMESPACE" deployment/prometheus-stack-kube-prom-prometheus -- wget -q --spider http://localhost:9090/-/healthy; then
        log_success "Prometheus is healthy"
    else
        log_warning "Prometheus health check failed"
    fi
    
    # Test Grafana
    if kubectl exec -n "$NAMESPACE" deployment/grafana -- wget -q --spider http://localhost:3000/api/health; then
        log_success "Grafana is healthy"
    else
        log_warning "Grafana health check failed"
    fi
    
    log_success "Deployment validation complete"
}

# Print access information
print_access_info() {
    log_info "Deployment complete! Access information:"
    
    echo
    echo "🔗 Service URLs:"
    echo "   Grafana:    https://grafana.$DOMAIN"
    echo "   Jaeger:     https://jaeger.$DOMAIN"
    echo "   Prometheus: kubectl port-forward -n $NAMESPACE svc/prometheus-stack-kube-prom-prometheus 9090:9090"
    echo "   Loki:       kubectl port-forward -n $NAMESPACE svc/loki 3100:3100"
    
    echo
    echo "🔑 Credentials:"
    echo "   Grafana Admin Username: admin"
    echo "   Grafana Admin Password: $GRAFANA_ADMIN_PASSWORD"
    
    echo
    echo "📊 Key Dashboards:"
    echo "   Platform Overview: https://grafana.$DOMAIN/d/intelgraph-overview"
    echo "   Maestro System: https://grafana.$DOMAIN/d/maestro-orchestration"
    echo "   Infrastructure: https://grafana.$DOMAIN/d/kubernetes-infrastructure"
    
    echo
    echo "🚨 Alerting:"
    echo "   AlertManager: kubectl port-forward -n $NAMESPACE svc/prometheus-stack-kube-prom-alertmanager 9093:9093"
    echo "   Runbooks: https://github.com/BrianCLong/summit/tree/main/charts/monitoring/runbooks"
    
    echo
    echo "🔍 Troubleshooting:"
    echo "   kubectl get pods -n $NAMESPACE"
    echo "   kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=<component>"
    echo "   kubectl describe pod -n $NAMESPACE <pod-name>"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -f /tmp/prometheus-values.yaml /tmp/grafana-values.yaml /tmp/jaeger-values.yaml /tmp/loki-values.yaml /tmp/promtail-values.yaml
}

# Main execution
main() {
    log_info "Starting IntelGraph monitoring stack deployment..."
    log_info "Target cluster: $CLUSTER_NAME"
    log_info "Environment: $ENVIRONMENT"
    log_info "Domain: $DOMAIN"
    
    check_prerequisites
    setup_namespace
    setup_secrets
    add_helm_repos
    deploy_prometheus
    deploy_grafana
    deploy_jaeger
    deploy_loki
    deploy_promtail
    deploy_otel_collector
    deploy_alert_rules
    import_dashboards
    validate_deployment
    print_access_info
    cleanup
    
    log_success "IntelGraph monitoring stack deployment complete! 🎉"
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@"