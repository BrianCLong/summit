#!/bin/bash
set -euo pipefail

# Evidence Bundle Generation Script
# Generates cryptographically signed evidence bundles for audit and compliance

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BUNDLE_ID="${1:-bundle-${TIMESTAMP}}"
NAMESPACE="${2:-plugin-marketplace-prod}"
OUTPUT_DIR="${3:-/tmp/evidence-bundles}"
EVIDENCE_DIR="$OUTPUT_DIR/$BUNDLE_ID"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $*"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $*"
}

# Error handler
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Evidence bundle generation failed with exit code: $exit_code"
    fi
    exit $exit_code
}

trap cleanup EXIT

log "=== Evidence Bundle Generation Started ==="
log "Bundle ID: $BUNDLE_ID"
log "Namespace: $NAMESPACE"
log "Output Directory: $EVIDENCE_DIR"

# Create evidence directory structure
mkdir -p "$EVIDENCE_DIR"/{cluster,security,monitoring,backup,compliance,metadata}

# Generate bundle metadata
cat > "$EVIDENCE_DIR/metadata/bundle-info.json" << EOF
{
  "bundleId": "$BUNDLE_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "namespace": "$NAMESPACE",
  "generator": "evidence-bundle-generator",
  "version": "1.0.0",
  "purpose": "Production readiness audit and compliance evidence",
  "retention": "365 days"
}
EOF

log_success "Bundle metadata created"

# Step 1: Collect Cluster State Evidence
log "Step 1: Collecting cluster state evidence"

# Kubernetes cluster info
kubectl cluster-info > "$EVIDENCE_DIR/cluster/cluster-info.txt" 2>&1 || true
kubectl version --output=json > "$EVIDENCE_DIR/cluster/cluster-version.json" 2>&1 || true
kubectl get nodes -o yaml > "$EVIDENCE_DIR/cluster/nodes.yaml" 2>&1 || true

# Namespace resources
kubectl get all -n "$NAMESPACE" -o yaml > "$EVIDENCE_DIR/cluster/namespace-resources.yaml" 2>&1 || true
kubectl get configmaps,secrets,pvc -n "$NAMESPACE" -o yaml > "$EVIDENCE_DIR/cluster/namespace-configs.yaml" 2>&1 || true
kubectl get networkpolicies -n "$NAMESPACE" -o yaml > "$EVIDENCE_DIR/cluster/network-policies.yaml" 2>&1 || true

# Resource quotas and limits
kubectl describe namespace "$NAMESPACE" > "$EVIDENCE_DIR/cluster/namespace-description.txt" 2>&1 || true
kubectl get resourcequota -n "$NAMESPACE" -o yaml > "$EVIDENCE_DIR/cluster/resource-quotas.yaml" 2>&1 || true
kubectl get limitrange -n "$NAMESPACE" -o yaml > "$EVIDENCE_DIR/cluster/limit-ranges.yaml" 2>&1 || true

# Pod security and compliance
kubectl get pods -n "$NAMESPACE" -o custom-columns="NAME:.metadata.name,READY:.status.conditions[?(@.type=='Ready')].status,STATUS:.status.phase,RESTARTS:.status.containerStatuses[*].restartCount,AGE:.metadata.creationTimestamp" > "$EVIDENCE_DIR/cluster/pod-status.txt" 2>&1 || true

# Collect pod security contexts
kubectl get pods -n "$NAMESPACE" -o json | jq '.items[] | {name: .metadata.name, securityContext: .spec.securityContext, containers: [.spec.containers[] | {name: .name, securityContext: .securityContext}]}' > "$EVIDENCE_DIR/cluster/pod-security-contexts.json" 2>&1 || true

log_success "Cluster state evidence collected"

# Step 2: Collect Security Evidence
log "Step 2: Collecting security evidence"

# Kyverno policies and reports
kubectl get clusterpolicies -o yaml > "$EVIDENCE_DIR/security/kyverno-cluster-policies.yaml" 2>&1 || true
kubectl get policies -n "$NAMESPACE" -o yaml > "$EVIDENCE_DIR/security/kyverno-namespace-policies.yaml" 2>&1 || true
kubectl get clusterpolicyreports -o yaml > "$EVIDENCE_DIR/security/kyverno-cluster-reports.yaml" 2>&1 || true
kubectl get policyreports -n "$NAMESPACE" -o yaml > "$EVIDENCE_DIR/security/kyverno-namespace-reports.yaml" 2>&1 || true

# OPA policies and violations
if kubectl get configmaps -n "$NAMESPACE" | grep -q opa-policy; then
    kubectl get configmaps -n "$NAMESPACE" -l app=opa -o yaml > "$EVIDENCE_DIR/security/opa-policies.yaml" 2>&1 || true
fi

# Image scan results and signatures
kubectl get pods -n "$NAMESPACE" -o jsonpath='{range .items[*]}{.spec.containers[*].image}{"\n"}{end}' | sort -u > "$EVIDENCE_DIR/security/container-images.txt" 2>&1 || true

# Verify image signatures if cosign is available
if command -v cosign &> /dev/null; then
    while IFS= read -r image; do
        if [[ -n "$image" ]]; then
            echo "=== Verifying signature for $image ===" >> "$EVIDENCE_DIR/security/image-signatures.txt"
            cosign verify --key cosign.pub "$image" >> "$EVIDENCE_DIR/security/image-signatures.txt" 2>&1 || \
                echo "No signature found or verification failed for $image" >> "$EVIDENCE_DIR/security/image-signatures.txt"
        fi
    done < "$EVIDENCE_DIR/security/container-images.txt"
fi

# Network policies and security groups
kubectl get networkpolicies -A -o yaml > "$EVIDENCE_DIR/security/all-network-policies.yaml" 2>&1 || true

# RBAC configuration
kubectl get rolebindings,clusterrolebindings -n "$NAMESPACE" -o yaml > "$EVIDENCE_DIR/security/rbac-bindings.yaml" 2>&1 || true
kubectl get roles,clusterroles -o yaml > "$EVIDENCE_DIR/security/rbac-roles.yaml" 2>&1 || true

log_success "Security evidence collected"

# Step 3: Collect Monitoring Evidence
log "Step 3: Collecting monitoring evidence"

# Prometheus configuration and rules
if kubectl get prometheus -n monitoring &> /dev/null; then
    kubectl get prometheus -n monitoring -o yaml > "$EVIDENCE_DIR/monitoring/prometheus-config.yaml" 2>&1 || true
    kubectl get prometheusrules -A -o yaml > "$EVIDENCE_DIR/monitoring/prometheus-rules.yaml" 2>&1 || true
fi

# ServiceMonitors for the namespace
kubectl get servicemonitors -n "$NAMESPACE" -o yaml > "$EVIDENCE_DIR/monitoring/service-monitors.yaml" 2>&1 || true

# Alert rules and firing alerts
if command -v promtool &> /dev/null; then
    find deploy/ -name "*prometheus*" -name "*.yaml" | xargs promtool check rules > "$EVIDENCE_DIR/monitoring/rule-validation.txt" 2>&1 || true
fi

# Grafana dashboards (if accessible)
if kubectl get configmaps -n monitoring | grep -q grafana-dashboards; then
    kubectl get configmaps -n monitoring -l grafana_dashboard=1 -o yaml > "$EVIDENCE_DIR/monitoring/grafana-dashboards.yaml" 2>&1 || true
fi

# Current metrics and alerts (if Prometheus is accessible)
if kubectl port-forward -n monitoring svc/prometheus 19090:9090 &
    PORT_FORWARD_PID=$!
    sleep 3
    curl -s "http://localhost:19090/api/v1/rules" > "$EVIDENCE_DIR/monitoring/current-rules.json" 2>&1 || true
    curl -s "http://localhost:19090/api/v1/alerts" > "$EVIDENCE_DIR/monitoring/current-alerts.json" 2>&1 || true
    kill $PORT_FORWARD_PID 2>/dev/null || true
fi

log_success "Monitoring evidence collected"

# Step 4: Collect Backup Evidence
log "Step 4: Collecting backup evidence"

# Velero backup schedules and status
if command -v velero &> /dev/null; then
    velero schedule get > "$EVIDENCE_DIR/backup/backup-schedules.txt" 2>&1 || true
    velero backup get | grep "$NAMESPACE" > "$EVIDENCE_DIR/backup/namespace-backups.txt" 2>&1 || true

    # Get latest backup details
    LATEST_BACKUP=$(velero backup get | grep "$NAMESPACE" | grep Completed | head -1 | awk '{print $1}')
    if [[ -n "$LATEST_BACKUP" ]]; then
        velero backup describe "$LATEST_BACKUP" > "$EVIDENCE_DIR/backup/latest-backup-details.txt" 2>&1 || true
        velero backup logs "$LATEST_BACKUP" > "$EVIDENCE_DIR/backup/latest-backup-logs.txt" 2>&1 || true
    fi

    # Backup storage locations
    velero backup-location get > "$EVIDENCE_DIR/backup/storage-locations.txt" 2>&1 || true
fi

# Database backup configurations (if PostgreSQL exists)
if kubectl get statefulsets -n "$NAMESPACE" | grep -q postgres; then
    kubectl describe statefulsets -n "$NAMESPACE" | grep -A 20 postgres > "$EVIDENCE_DIR/backup/postgres-config.txt" 2>&1 || true
fi

log_success "Backup evidence collected"

# Step 5: Collect Compliance Evidence
log "Step 5: Collecting compliance evidence"

# Pod Security Standards enforcement
kubectl get namespace "$NAMESPACE" -o json | jq '.metadata.labels | to_entries | map(select(.key | contains("pod-security")))' > "$EVIDENCE_DIR/compliance/pod-security-labels.json" 2>&1 || true

# Security context compliance
kubectl get pods -n "$NAMESPACE" -o json | jq '.items[] | {
  name: .metadata.name,
  runAsNonRoot: .spec.securityContext.runAsNonRoot,
  runAsUser: .spec.securityContext.runAsUser,
  fsGroup: .spec.securityContext.fsGroup,
  containers: [.spec.containers[] | {
    name: .name,
    runAsNonRoot: .securityContext.runAsNonRoot,
    allowPrivilegeEscalation: .securityContext.allowPrivilegeEscalation,
    readOnlyRootFilesystem: .securityContext.readOnlyRootFilesystem,
    capabilities: .securityContext.capabilities
  }]
}' > "$EVIDENCE_DIR/compliance/security-context-compliance.json" 2>&1 || true

# Resource limits compliance
kubectl get pods -n "$NAMESPACE" -o json | jq '.items[] | {
  name: .metadata.name,
  containers: [.spec.containers[] | {
    name: .name,
    resources: .resources
  }]
}' > "$EVIDENCE_DIR/compliance/resource-limits-compliance.json" 2>&1 || true

# Image registry compliance
kubectl get pods -n "$NAMESPACE" -o json | jq -r '.items[] | .spec.containers[] | .image' | sort -u | while read -r image; do
    echo "$image" >> "$EVIDENCE_DIR/compliance/image-registry-audit.txt"
done 2>&1 || true

# Admission controller evidence
kubectl get validatingadmissionwebhooks -o yaml > "$EVIDENCE_DIR/compliance/validating-admission-webhooks.yaml" 2>&1 || true
kubectl get mutatingadmissionwebhooks -o yaml > "$EVIDENCE_DIR/compliance/mutating-admission-webhooks.yaml" 2>&1 || true

log_success "Compliance evidence collected"

# Step 6: Generate Evidence Summary
log "Step 6: Generating evidence summary"

# Count collected evidence files
TOTAL_FILES=$(find "$EVIDENCE_DIR" -type f | wc -l)
EVIDENCE_SIZE=$(du -sh "$EVIDENCE_DIR" | cut -f1)

# Generate summary report
cat > "$EVIDENCE_DIR/EVIDENCE_SUMMARY.md" << EOF
# Evidence Bundle Summary

**Bundle ID:** $BUNDLE_ID
**Generated:** $(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
**Namespace:** $NAMESPACE
**Total Files:** $TOTAL_FILES
**Bundle Size:** $EVIDENCE_SIZE

## Evidence Categories

### Cluster State
- Node information and cluster version
- Namespace resources and configurations
- Resource quotas and limits
- Pod status and security contexts

### Security
- Kyverno policies and reports
- OPA policies and violations
- Container image signatures
- RBAC configuration
- Network policies

### Monitoring
- Prometheus configuration and rules
- ServiceMonitors and alerting rules
- Grafana dashboards
- Current metrics and alerts

### Backup & Recovery
- Velero backup schedules and status
- Backup storage locations
- Database backup configurations
- Latest backup details and logs

### Compliance
- Pod Security Standards enforcement
- Security context compliance
- Resource limits compliance
- Image registry audit
- Admission controller configuration

## File Listing

\`\`\`
$(find "$EVIDENCE_DIR" -type f | sort)
\`\`\`

## Verification

This evidence bundle can be verified using:
\`\`\`bash
# Verify bundle integrity
sha256sum -c evidence-bundle.sha256

# Verify digital signature
cosign verify-blob --key cosign.pub --signature evidence-bundle.sig evidence-bundle.tar.gz
\`\`\`

---
Generated by Evidence Bundle Generator v1.0
EOF

log_success "Evidence summary generated"

# Step 7: Create checksums and signatures
log "Step 7: Creating checksums and signatures"

# Generate checksums for all files
find "$EVIDENCE_DIR" -type f -exec sha256sum {} \; > "$EVIDENCE_DIR/checksums.sha256"

# Create bundle tarball
cd "$OUTPUT_DIR"
tar -czf "${BUNDLE_ID}.tar.gz" "$BUNDLE_ID/"

# Generate SHA256 for the bundle
sha256sum "${BUNDLE_ID}.tar.gz" > "${BUNDLE_ID}.sha256"

# Sign the bundle if cosign is available
if command -v cosign &> /dev/null && [[ -n "${COSIGN_PRIVATE_KEY:-}" ]]; then
    cosign sign-blob --key "${COSIGN_PRIVATE_KEY}" "${BUNDLE_ID}.tar.gz" > "${BUNDLE_ID}.sig"
    log_success "Bundle signed with cosign"
elif command -v gpg &> /dev/null && [[ -n "${GPG_KEY_ID:-}" ]]; then
    gpg --armor --detach-sign --default-key "${GPG_KEY_ID}" "${BUNDLE_ID}.tar.gz"
    log_success "Bundle signed with GPG"
else
    log_warning "No signing key available - bundle not signed"
fi

# Generate attestation
cat > "${BUNDLE_ID}.attestation.json" << EOF
{
  "subject": [
    {
      "name": "${BUNDLE_ID}.tar.gz",
      "digest": {
        "sha256": "$(sha256sum "${BUNDLE_ID}.tar.gz" | awk '{print $1}')"
      }
    }
  ],
  "predicateType": "https://slsa.dev/provenance/v0.2",
  "predicate": {
    "builder": {
      "id": "https://github.com/intelgraph/evidence-bundle-generator"
    },
    "buildType": "evidence-collection",
    "invocation": {
      "configSource": {
        "uri": "urn:evidence-bundle",
        "digest": {
          "sha1": "$(echo -n "$BUNDLE_ID" | sha1sum | awk '{print $1}')"
        }
      },
      "parameters": {
        "namespace": "$NAMESPACE",
        "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
      }
    },
    "metadata": {
      "buildInvocationId": "$BUNDLE_ID",
      "buildStartedOn": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
      "completeness": {
        "parameters": true,
        "environment": true,
        "materials": true
      }
    },
    "materials": [
      {
        "uri": "k8s://cluster/$NAMESPACE",
        "digest": {
          "sha256": "$(kubectl get namespace "$NAMESPACE" -o json | sha256sum | awk '{print $1}')"
        }
      }
    ]
  }
}
EOF

log_success "Bundle attestation generated"

# Step 8: Generate final report
log "Step 8: Generating final report"

cat > "${BUNDLE_ID}-report.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Evidence Bundle Report - $BUNDLE_ID</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .section { margin: 20px 0; }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .code { background-color: #f5f5f5; padding: 10px; border-radius: 3px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Evidence Bundle Report</h1>
        <p><strong>Bundle ID:</strong> $BUNDLE_ID</p>
        <p><strong>Generated:</strong> $(date)</p>
        <p><strong>Namespace:</strong> $NAMESPACE</p>
        <p><strong>Total Files:</strong> $TOTAL_FILES</p>
        <p><strong>Bundle Size:</strong> $EVIDENCE_SIZE</p>
    </div>

    <div class="section">
        <h2>Bundle Contents</h2>
        <table>
            <tr><th>Category</th><th>Files</th><th>Description</th></tr>
            <tr><td>Cluster State</td><td>$(find "$EVIDENCE_DIR/cluster" -type f | wc -l)</td><td>Node info, resources, quotas</td></tr>
            <tr><td>Security</td><td>$(find "$EVIDENCE_DIR/security" -type f | wc -l)</td><td>Policies, signatures, RBAC</td></tr>
            <tr><td>Monitoring</td><td>$(find "$EVIDENCE_DIR/monitoring" -type f | wc -l)</td><td>Prometheus, alerts, dashboards</td></tr>
            <tr><td>Backup</td><td>$(find "$EVIDENCE_DIR/backup" -type f | wc -l)</td><td>Schedules, storage, logs</td></tr>
            <tr><td>Compliance</td><td>$(find "$EVIDENCE_DIR/compliance" -type f | wc -l)</td><td>PSS, contexts, admission</td></tr>
        </table>
    </div>

    <div class="section">
        <h2>Verification</h2>
        <div class="code">
# Verify bundle integrity<br>
sha256sum -c ${BUNDLE_ID}.sha256<br><br>

# Extract bundle<br>
tar -xzf ${BUNDLE_ID}.tar.gz<br><br>

# Verify individual file checksums<br>
cd $BUNDLE_ID && sha256sum -c checksums.sha256
        </div>
    </div>

    <div class="section">
        <h2>Attestation</h2>
        <p>This bundle includes a cryptographic attestation providing:</p>
        <ul>
            <li>Builder identity and build type</li>
            <li>Source materials and parameters</li>
            <li>Completeness guarantees</li>
            <li>Timestamp and invocation ID</li>
        </ul>
        <p><strong>Attestation File:</strong> ${BUNDLE_ID}.attestation.json</p>
    </div>

    <div class="section">
        <h2>Retention</h2>
        <p>This evidence bundle should be retained for <strong>365 days</strong> for audit and compliance purposes.</p>
        <p><strong>Storage Location:</strong> $OUTPUT_DIR</p>
        <p><strong>Destruction Date:</strong> $(date -d '+365 days' +%Y-%m-%d)</p>
    </div>
</body>
</html>
EOF

log_success "Final report generated: ${BUNDLE_ID}-report.html"

# Step 9: Upload to secure storage (if configured)
if [[ -n "${S3_BUCKET:-}" ]]; then
    log "Step 9: Uploading to secure storage"

    aws s3 cp "${BUNDLE_ID}.tar.gz" "s3://${S3_BUCKET}/evidence-bundles/" --sse aws:kms --sse-kms-key-id "${KMS_KEY_ID:-alias/evidence-bundle-key}"
    aws s3 cp "${BUNDLE_ID}.sha256" "s3://${S3_BUCKET}/evidence-bundles/"
    aws s3 cp "${BUNDLE_ID}.attestation.json" "s3://${S3_BUCKET}/evidence-bundles/"

    if [[ -f "${BUNDLE_ID}.sig" ]]; then
        aws s3 cp "${BUNDLE_ID}.sig" "s3://${S3_BUCKET}/evidence-bundles/"
    fi

    log_success "Bundle uploaded to S3: s3://${S3_BUCKET}/evidence-bundles/"
fi

# Final summary
cd "$OUTPUT_DIR"
log_success "=== Evidence Bundle Generation Completed ==="
log "Bundle Location: $OUTPUT_DIR/${BUNDLE_ID}.tar.gz"
log "Bundle Size: $(du -sh "${BUNDLE_ID}.tar.gz" | cut -f1)"
log "SHA256: $(cat "${BUNDLE_ID}.sha256")"
log "Report: $OUTPUT_DIR/${BUNDLE_ID}-report.html"

if [[ -f "${BUNDLE_ID}.sig" ]]; then
    log "Signature: $OUTPUT_DIR/${BUNDLE_ID}.sig"
fi

echo
echo "To verify the bundle:"
echo "  sha256sum -c ${BUNDLE_ID}.sha256"
echo "  tar -xzf ${BUNDLE_ID}.tar.gz"
echo "  cd $BUNDLE_ID && sha256sum -c checksums.sha256"

exit 0