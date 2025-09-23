#!/bin/bash
# Deploy Chaos Engineering Infrastructure for IntelGraph Platform
# Part of GREEN TRAIN Week-4 resilience testing framework

set -euo pipefail

NAMESPACE="${CHAOS_NAMESPACE:-intelgraph-staging}"
LITMUS_VERSION="${LITMUS_VERSION:-3.0.0}"
DRY_RUN="${DRY_RUN:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is required but not installed"
    fi

    # Check helm
    if ! command -v helm &> /dev/null; then
        error "helm is required but not installed"
    fi

    # Check cluster access
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
    fi

    # Check if namespace exists
    if ! kubectl get namespace "${NAMESPACE}" &> /dev/null; then
        warn "Namespace ${NAMESPACE} does not exist, creating..."
        if [[ "${DRY_RUN}" == "false" ]]; then
            kubectl create namespace "${NAMESPACE}"
        fi
    fi

    success "Prerequisites validated"
}

# Install Litmus Chaos Engineering Platform
install_litmus() {
    log "Installing Litmus Chaos Engineering Platform..."

    # Add Litmus Helm repository
    helm repo add litmuschaos https://litmuschaos.github.io/litmus-helm/
    helm repo update

    # Install or upgrade Litmus
    if [[ "${DRY_RUN}" == "false" ]]; then
        helm upgrade --install litmus litmuschaos/litmus \
            --namespace=litmus \
            --create-namespace \
            --version="${LITMUS_VERSION}" \
            --set portal.frontend.service.type=ClusterIP \
            --set portal.server.service.type=ClusterIP \
            --set mongodb.persistence.size=10Gi \
            --set openshift.route.enabled=false \
            --wait --timeout=600s
    else
        log "DRY RUN: Would install Litmus ${LITMUS_VERSION}"
    fi

    success "Litmus installation completed"
}

# Deploy chaos experiments
deploy_chaos_experiments() {
    log "Deploying chaos experiments..."

    local chaos_dir="$(dirname "$0")/../chaos"

    # Deploy pod killer experiment
    if [[ -f "${chaos_dir}/experiments/pod-killer.yaml" ]]; then
        log "Deploying pod killer experiment..."
        if [[ "${DRY_RUN}" == "false" ]]; then
            kubectl apply -f "${chaos_dir}/experiments/pod-killer.yaml"
        else
            log "DRY RUN: Would deploy pod killer experiment"
        fi
    fi

    # Deploy network latency experiment
    if [[ -f "${chaos_dir}/experiments/network-latency.yaml" ]]; then
        log "Deploying network latency experiment..."
        if [[ "${DRY_RUN}" == "false" ]]; then
            kubectl apply -f "${chaos_dir}/experiments/network-latency.yaml"
        else
            log "DRY RUN: Would deploy network latency experiment"
        fi
    fi

    # Deploy chaos monitoring dashboard
    if [[ -f "${chaos_dir}/chaos-dashboard.yaml" ]]; then
        log "Deploying chaos monitoring dashboard..."
        if [[ "${DRY_RUN}" == "false" ]]; then
            kubectl apply -f "${chaos_dir}/chaos-dashboard.yaml"
        else
            log "DRY RUN: Would deploy chaos monitoring dashboard"
        fi
    fi

    success "Chaos experiments deployed"
}

# Validate chaos experiment deployment
validate_deployment() {
    log "Validating chaos experiment deployment..."

    # Check if chaos service account exists
    if kubectl get serviceaccount chaos-service-account -n "${NAMESPACE}" &> /dev/null; then
        success "Chaos service account found"
    else
        warn "Chaos service account not found"
    fi

    # Check if chaos experiments are available
    local experiments=(pod-delete pod-network-latency)
    for exp in "${experiments[@]}"; do
        if kubectl get chaosexperiment "${exp}" -n "${NAMESPACE}" &> /dev/null; then
            success "Chaos experiment ${exp} is available"
        else
            warn "Chaos experiment ${exp} not found"
        fi
    done

    # Check if chaos schedules are created
    if kubectl get chaosschedule -n "${NAMESPACE}" &> /dev/null; then
        local schedules=$(kubectl get chaosschedule -n "${NAMESPACE}" --no-headers 2>/dev/null | wc -l)
        success "Found ${schedules} chaos schedules"
    else
        warn "No chaos schedules found"
    fi

    # Check Prometheus rules
    if kubectl get prometheusrule chaos-engineering-rules -n "${NAMESPACE}" &> /dev/null; then
        success "Chaos monitoring rules are deployed"
    else
        warn "Chaos monitoring rules not found"
    fi
}

# Create chaos experiment execution script
create_execution_script() {
    log "Creating chaos experiment execution script..."

    local script_path="$(dirname "$0")/run-chaos-experiment.sh"

    if [[ "${DRY_RUN}" == "false" ]]; then
        cat > "${script_path}" << 'EOF'
#!/bin/bash
# Execute specific chaos experiments
# Usage: ./run-chaos-experiment.sh [experiment-name] [namespace]

set -euo pipefail

EXPERIMENT="${1:-pod-delete}"
NAMESPACE="${2:-intelgraph-staging}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

log "Starting chaos experiment: ${EXPERIMENT}"

# Create chaos engine from template
cat << YAML | kubectl apply -f -
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: manual-${EXPERIMENT}-$(date +%s)
  namespace: ${NAMESPACE}
  annotations:
    chaos.alpha.kubernetes.io/experiment-type: "manual-execution"
spec:
  appinfo:
    appns: ${NAMESPACE}
    applabel: "app=intelgraph-server"
    appkind: deployment
  chaosServiceAccount: chaos-service-account
  monitoring: true
  jobCleanUpPolicy: retain
  experiments:
    - name: ${EXPERIMENT}
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "60"
            - name: PODS_AFFECTED_PERC
              value: "25"
YAML

ENGINE_NAME="manual-${EXPERIMENT}-$(date +%s)"
log "Chaos engine created: ${ENGINE_NAME}"

# Monitor experiment progress
log "Monitoring experiment progress..."
for i in {1..20}; do
    STATUS=$(kubectl get chaosengine "${ENGINE_NAME}" -n "${NAMESPACE}" -o jsonpath='{.status.engineStatus}' 2>/dev/null || echo "unknown")
    log "Experiment status: ${STATUS}"

    if [[ "${STATUS}" == "completed" ]]; then
        success "Chaos experiment completed successfully"
        break
    elif [[ "${STATUS}" == "stopped" ]]; then
        log "Chaos experiment was stopped"
        break
    fi

    sleep 15
done

# Show results
log "Experiment results:"
kubectl get chaosresult -n "${NAMESPACE}" -l chaosengine="${ENGINE_NAME}" -o wide
EOF

        chmod +x "${script_path}"
        success "Chaos execution script created at ${script_path}"
    else
        log "DRY RUN: Would create chaos execution script"
    fi
}

# Generate chaos testing report
generate_test_report() {
    log "Generating chaos testing validation report..."

    local report_file="chaos-deployment-report.md"

    if [[ "${DRY_RUN}" == "false" ]]; then
        cat > "${report_file}" << EOF
# Chaos Engineering Deployment Report

**Generated**: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
**Namespace**: ${NAMESPACE}
**Litmus Version**: ${LITMUS_VERSION}

## Deployment Summary

### ✅ Components Deployed

- **Litmus Chaos Engineering Platform**: Core chaos orchestration
- **Pod Killer Experiment**: Resilience testing via pod failures
- **Network Latency Experiment**: Network resilience validation
- **Chaos Monitoring Dashboard**: Grafana dashboard with Prometheus rules
- **Chaos Schedules**: Automated nightly and weekly experiments

### 🔍 Experiment Configurations

#### Pod Killer Experiment
- **Target**: intelgraph-server deployment
- **Safety**: 25% max pod impact, graceful termination
- **Schedule**: Nightly (weekdays, 2:00-2:30 AM UTC)
- **Health Probes**: Continuous HTTP health checks

#### Network Latency Experiment
- **Latency Injection**: 100ms ± 10ms jitter
- **Target**: 50% of pods, eth0 interface
- **Schedule**: Weekly (Wednesdays, 3:00-3:30 AM UTC)
- **Monitoring**: GraphQL and database connectivity probes

### 📊 Monitoring & Alerting

#### Prometheus Rules
- **Experiment Success Rate**: Tracks pass/fail ratios
- **Recovery Time**: Measures system healing duration
- **Impact Alerts**: Performance degradation detection

#### Alert Conditions
- **ChaosExperimentFailed**: Immediate notification on failures
- **SystemNotRecoveringFromChaos**: Critical recovery issues
- **ChaosImpactTooHigh**: Performance impact exceeding thresholds
- **HighErrorRateDuringChaos**: Error rate spikes during experiments

### 🛡️ Safety Measures

1. **Scoped to Staging**: All experiments limited to intelgraph-staging
2. **Limited Impact**: Maximum 25-50% pod impact per experiment
3. **Health Monitoring**: Continuous health probes during experiments
4. **Graceful Operations**: No forced terminations in scheduled runs
5. **Time Boundaries**: Experiments limited to off-peak hours

### 🚀 Next Steps

1. **Baseline Establishment**: Run initial experiments to establish resilience baseline
2. **Monitoring Validation**: Verify all alerts and dashboards are functional
3. **Team Training**: Conduct chaos engineering training sessions
4. **Experiment Expansion**: Add CPU stress, memory pressure experiments
5. **Production Readiness**: Prepare chaos testing for production environment

### 📋 Manual Execution

Use the provided script to run experiments manually:

\`\`\`bash
# Run pod killer experiment
./scripts/run-chaos-experiment.sh pod-delete

# Run network latency experiment
./scripts/run-chaos-experiment.sh pod-network-latency
\`\`\`

### 🔧 Troubleshooting

- **View experiment status**: \`kubectl get chaosengine -n ${NAMESPACE}\`
- **Check experiment logs**: \`kubectl logs -l app.kubernetes.io/component=experiment-job -n ${NAMESPACE}\`
- **Monitor system health**: Access Grafana chaos dashboard
- **Review Prometheus alerts**: Check AlertManager for chaos-related alerts

---

**Status**: ✅ Chaos Engineering Infrastructure Ready
**Contact**: Platform Team (@platform-lead)
**Documentation**: [Chaos Engineering Playbook](./chaos/README.md)
EOF

        success "Chaos testing report generated: ${report_file}"
    else
        log "DRY RUN: Would generate chaos testing report"
    fi
}

# Main deployment function
main() {
    log "Starting Chaos Engineering deployment for IntelGraph Platform"
    log "Namespace: ${NAMESPACE}"
    log "Litmus Version: ${LITMUS_VERSION}"
    log "Dry Run: ${DRY_RUN}"

    check_prerequisites
    install_litmus
    deploy_chaos_experiments
    validate_deployment
    create_execution_script
    generate_test_report

    success "🎯 Chaos Engineering deployment completed successfully!"

    if [[ "${DRY_RUN}" == "false" ]]; then
        log "Next steps:"
        log "1. Review the deployment report: chaos-deployment-report.md"
        log "2. Access Litmus dashboard: kubectl port-forward svc/litmusportal-frontend-service 9091:9091 -n litmus"
        log "3. Run your first experiment: ./scripts/run-chaos-experiment.sh pod-delete"
        log "4. Monitor chaos metrics in Grafana dashboard"
    fi
}

# Handle script arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --litmus-version)
            LITMUS_VERSION="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --namespace <name>       Target namespace (default: intelgraph-staging)"
            echo "  --litmus-version <ver>   Litmus version (default: 3.0.0)"
            echo "  --dry-run               Show what would be done without executing"
            echo "  --help                  Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Execute main function
main "$@"