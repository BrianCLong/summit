#!/bin/bash

# scripts/ops/activate-maestro.sh
# This script automates the last-mile ops for Maestro Conductor go-live in dev/staging.
# It creates/updates K8s secrets, triggers the CD pipeline, and runs readiness queries.

set -euo pipefail

# --- Configuration Variables (ADJUST THESE) ---
# These should ideally come from a secure CI/CD environment or a local .env file
# For this script, we'll use placeholders or environment variables if set.

# Kubernetes Namespace for Maestro application
NAMESPACE="${NAMESPACE:-maestro-system}"
# Kubernetes Namespace for Monitoring components (Prometheus, Alertmanager, Blackbox Exporter)
MON_NS="${MON_NS:-monitoring}"
# Kubernetes Namespace for OPA policies (if applicable)
OPA_NS="${OPA_NS:-opa}"

# Maestro Hostname for the target environment (e.g., maestro.staging.intelgraph.ai)
MAESTRO_HOST="${MAESTRO_HOST:-maestro.dev.intelgraph.ai}"
# Image tag to deploy (e.g., sha-abcdef123456 or a SemVer tag)
IMAGE_TAG="${IMAGE_TAG:-sha-$(git rev-parse --short=12 HEAD)}"

# Neo4j Credentials
NEO4J_URI="${NEO4J_URI:-bolt+s://neo4j.data.svc.cluster.local:7687}"
NEO4J_USER="${NEO4J_USER:-neo4j}"
NEO4J_PASSWORD="${NEO4J_PASSWORD:-super-secret-neo4j}"

# OIDC/JWT Configuration (if using)
OIDC_ISSUER_URL="${OIDC_ISSUER_URL:-https://idp.dev.example/realms/intelgraph}"
OIDC_CLIENT_ID="${OIDC_CLIENT_ID:-intelgraph-dev}"
OIDC_CLIENT_SECRET="${OIDC_CLIENT_SECRET:-REDACTED_OIDC_CLIENT_SECRET}"
JWT_PUBLIC_KEY="${JWT_PUBLIC_KEY:-}" # PEM format, multiline string
JWT_SECRET="${JWT_SECRET:-}" # HS256 secret

# API Key Stop-Gap (0 for disabled, 1 for enabled temporarily)
ENABLE_API_KEYS="${ENABLE_API_KEYS:-0}"
API_KEYS="${API_KEYS:-}" # comma-separated, e.g., "key1:admin:24,key2:read:12"

# PagerDuty Routing Key
PAGERDUTY_ROUTING_KEY="${PAGERDUTY_ROUTING_KEY:-REDACTED_PAGERDUTY_KEY}"

# Prometheus and Alertmanager URLs (in-cluster service names)
PROM_URL="${PROM_URL:-http://prometheus-operated.${MON_NS}:9090}"
ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://alertmanager-operated.${MON_NS}:9093}"

# --- Helper Functions ---
log_info() { echo -e "\033[0;34m[INFO]\033[0m $1"; }
log_success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
log_warn() { echo -e "\033[0;33m[WARN]\033[0m $1"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; exit 1; }

# --- Main Script Logic ---

# 1. Create Namespaces (idempotent)
log_info "Ensuring Kubernetes namespaces exist..."
kubectl create ns "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
kubectl create ns "$MON_NS" --dry-run=client -o yaml | kubectl apply -f -
log_success "Namespaces $NAMESPACE and $MON_NS ensured."

# 2. Populate Kubernetes Secrets and Core Config
log_info "Populating Maestro application secrets..."

# Delete existing secrets to ensure clean update (ignore not found errors)
kubectl -n "$NAMESPACE" delete secret maestro-secrets --ignore-not-found || true
kubectl -n "$MON_NS" delete secret pagerduty-routing-key --ignore-not-found || true

# Create maestro-secrets
SECRET_CMD="kubectl -n $NAMESPACE create secret generic maestro-secrets \
  --from-literal=NEO4J_URI=\"$NEO4J_URI\" \
  --from-literal=NEO4J_USER=\"$NEO4J_USER\" \
  --from-literal=NEO4J_USERNAME=\"$NEO4J_USER\" \
  --from-literal=NEO4J_PASSWORD=\"$NEO4J_PASSWORD\" \
  --from-literal=OIDC_ISSUER_URL=\"$OIDC_ISSUER_URL\" \
  --from-literal=OIDC_CLIENT_ID=\"$OIDC_CLIENT_ID\" \
  --from-literal=OIDC_CLIENT_SECRET=\"$OIDC_CLIENT_SECRET\" \
  --from-literal=ENABLE_API_KEYS=\"$ENABLE_API_KEYS\" \
  --from-literal=API_KEYS=\"$API_KEYS\""

# Conditionally add JWT_PUBLIC_KEY or JWT_SECRET if provided
if [ -n "$JWT_PUBLIC_KEY" ]; then
  SECRET_CMD+=\" --from-literal=JWT_PUBLIC_KEY=\"$JWT_PUBLIC_KEY\""
elif [ -n "$JWT_SECRET" ]; then
  SECRET_CMD+=\" --from-literal=JWT_SECRET=\"$JWT_SECRET\""
fi

# Execute the secret creation command
eval "$SECRET_CMD" --dry-run=client -o yaml | kubectl apply -f -
log_success "Maestro application secrets (maestro-secrets) created/updated."

# Create pagerduty-routing-key secret
kubectl -n "$MON_NS" create secret generic pagerduty-routing-key \
  --from-literal=ROUTING_KEY=\"$PAGERDUTY_ROUTING_KEY\" --dry-run=client -o yaml | kubectl apply -f -
log_success "PagerDuty routing key secret created/updated."

# Apply Maestro ConfigMap (non-secret knobs)
log_info "Applying Maestro ConfigMap..."
kubectl -n "$NAMESPACE" apply -f k8s/maestro-configmap.yaml
log_success "Maestro ConfigMap applied."

# 3. Trigger CD Pipeline (via GitHub Actions workflow dispatch)
log_info "Triggering GitHub Actions CD pipeline..."
# This assumes you have 'gh' CLI installed and authenticated
# and that your CD workflow is set up for 'workflow_dispatch'

# Find the workflow ID or name for your CD pipeline
# Assuming the CD workflow is named 'deploy_dev' or similar in .github/workflows/ci.yaml
# You might need to adjust this to match your actual CD workflow name/ID

# For simplicity, we'll assume the CD workflow is triggered by a push to main
# and the deploy-maestro-helm.sh script is run manually or by a separate job.
# If you have a workflow_dispatch enabled CD, you'd use:
# gh workflow run deploy_dev.yml -F image_tag="$IMAGE_TAG" -F host="$MAESTRO_HOST"

log_warn "Automated CD trigger via 'gh workflow run' is commented out. Please trigger manually or uncomment if configured."
log_info "Proceeding to manual deployment step for verification."

# 4. Execute Deployment (Helm script)
log_info "Executing Maestro Helm deployment script..."
# Ensure the script is executable: chmod +x scripts/deploy-maestro-helm.sh
bash scripts/deploy-maestro-helm.sh \
  --host "$MAESTRO_HOST" \
  --tag "$IMAGE_TAG" \
  --namespace "$NAMESPACE"
log_success "Maestro Helm deployment initiated. Watch rollout status."

# 5. Run Readiness Gate Checks
log_info "Running readiness gate checks..."

# 5.1 Rollout Health
log_info "Checking Argo Rollout health..."
kubectl -n "$NAMESPACE" argo rollouts get rollout maestro-server --watch || log_warn "Rollout status check failed or timed out."
log_success "Argo Rollout status checked."

# 5.2 Blackbox Metrics Present
log_info "Checking Blackbox Exporter metrics..."
# This assumes Blackbox Exporter is deployed and scraping the /health endpoint
# and Prometheus is reachable at $PROM_URL

# Query for probe_success metric
PROBE_SUCCESS_QUERY="avg_over_time(probe_success{job=\"blackbox\",instance=\"https://$MAESTRO_HOST/health\"}[5m])"
PROBE_SUCCESS_RESULT=$(kubectl -n "$MON_NS" run prom-curl --rm -i -t --image=curlimages/curl --restart=Never -- \
  sh -lc "curl -sG $PROM_URL/api/v1/query --data-urlencode 'query=$PROBE_SUCCESS_QUERY'" | jq -r '.data.result[0].value[1]' || echo "")

if [ -n "$PROBE_SUCCESS_RESULT" ] && (( $(echo "$PROBE_SUCCESS_RESULT >= 0.99" | bc -l) )); then
  log_success "Blackbox availability (probe_success) is healthy: $PROBE_SUCCESS_RESULT"
else
  log_warn "Blackbox availability (probe_success) is low or not available: $PROBE_SUCCESS_RESULT"
fi

# Query for p95 TTFB
P95_TTFB_QUERY="histogram_quantile(0.95,sum(rate(probe_http_duration_seconds_bucket{job=\"blackbox\",phase=\"first_byte\",instance=\"https://$MAESTRO_HOST/health\"}[5m])) by (le))"
P95_TTFB_RESULT=$(kubectl -n "$MON_NS" run prom-curl --rm -i -t --image=curlimages/curl --restart=Never -- \
  sh -lc "curl -sG $PROM_URL/api/v1/query --data-urlencode 'query=$P95_TTFB_QUERY'" | jq -r '.data.result[0].value[1]' || echo "")

if [ -n "$P95_TTFB_RESULT" ] && (( $(echo "$P95_TTFB_RESULT <= 1.5" | bc -l) )); then
  log_success "Blackbox p95 TTFB is healthy: ${P95_TTFB_RESULT}s"
else
  log_warn "Blackbox p95 TTFB is high or not available: ${P95_TTFB_RESULT}s"
fi

# 5.3 Alertmanager Test
log_info "Testing Alertmanager path..."
AM_TEST_RESULT=$(kubectl -n "$MON_NS" run am-test --rm -i -t --image=curlimages/curl --restart=Never -- \
  sh -lc "curl -sv -XPOST -H 'Content-Type: application/json' \
  $ALERTMANAGER_URL/api/v2/alerts -d '[{\"labels\":{\"alertname\":\"TestPage\",\"service\":\"maestro\",\"severity\":\"critical\"},\"annotations\":{\"summary\":\"Manual test\"}}]'" 2>&1 | grep "< HTTP/2 20" || echo "")

if [ -n "$AM_TEST_RESULT" ]; then
  log_success "Alertmanager test successful (received 202 Accepted)."
else
  log_warn "Alertmanager test failed or did not receive 202 Accepted."
fi

# 5.4 Functional Smoke (k6)
log_info "Running k6 functional smoke test..."
# This assumes k6 is installed locally where this script is run
# and that the MAESTRO_HOST is externally accessible or port-forwarded

# You might need to port-forward Maestro service if running locally and not via Ingress
# kubectl -n $NAMESPACE port-forward svc/maestro-server 8080:8080 &

k6 run scripts/k6/conductor_canary_smoke.js -e BASE="https://$MAESTRO_HOST" -e VUS=5 -e DURATION=1m || log_warn "k6 smoke test failed."
log_success "k6 functional smoke test completed."

log_info "--- Readiness Gate Checks Completed ---"
log_info "Review logs above for success/failure of individual checks."

# --- Final Summary ---
log_info "Finalizing Maestro Conductor Activation."
log_success "Activation script finished. Please review the output and proceed with promotion if all checks passed."

# Optional: Promote canary to 100% if all checks passed
# kubectl -n "$NAMESPACE" argo rollouts promote maestro-rollout
