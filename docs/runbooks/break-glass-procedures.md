# 🚨 Break-Glass Emergency Access Procedures

**Classification:** Restricted
**Access Level:** Emergency Only
**Auto-Revocation:** 2 Hours
**Audit Requirements:** Full logging enabled

## 🎯 Break-Glass Activation Criteria

**Activate break-glass access ONLY when:**

- Primary authentication system is completely down
- Critical security incident requires immediate investigation
- Data loss prevention requires emergency intervention
- System compromise requires immediate containment

**DO NOT activate for:**

- Routine troubleshooting
- Performance degradation (use normal escalation)
- Planned maintenance
- Non-critical service disruptions

## 👥 2-User Break-Glass System

### Principle of Dual Control

- **User 1 (Break-Glass Admin):** Full administrative access
- **User 2 (Break-Glass Operator):** Monitoring and restart permissions
- **Both required:** for destructive operations
- **Time-boxed:** Automatic revocation after 2 hours
- **Audit trail:** All actions logged and immutable

## 🔓 Activation Procedures

### Step 1: Emergency Access Activation

```bash
# Execute from any kubectl-enabled system
kubectl apply -f - << 'EOF'
apiVersion: batch/v1
kind: Job
metadata:
  name: break-glass-activation
  namespace: intelgraph-prod
spec:
  template:
    spec:
      serviceAccountName: emergency-access
      containers:
      - name: break-glass
        image: emergency-access-toolkit:latest
        command: ["/scripts/activate-break-glass.sh"]
        env:
        - name: INCIDENT_ID
          value: "REPLACE_WITH_INCIDENT_ID"
        - name: REQUESTED_BY
          value: "REPLACE_WITH_YOUR_NAME"
        - name: BREAK_GLASS_REASON
          value: "REPLACE_WITH_JUSTIFICATION"
      restartPolicy: Never
EOF
```

### Step 2: User 1 (Break-Glass Admin) Access

```bash
# Create emergency admin user
EMERGENCY_ADMIN_TOKEN=$(kubectl create token emergency-admin-sa \
    --namespace intelgraph-prod \
    --duration=2h)

# Generate temporary kubectl config
kubectl config set-cluster emergency-cluster \
    --server=$(kubectl config view -o jsonpath='{.clusters[0].cluster.server}') \
    --insecure-skip-tls-verify=true

kubectl config set-credentials emergency-admin \
    --token=$EMERGENCY_ADMIN_TOKEN

kubectl config set-context emergency-context \
    --cluster=emergency-cluster \
    --user=emergency-admin \
    --namespace=intelgraph-prod

echo "🚨 Break-Glass Admin access granted for 2 hours"
echo "Switch context: kubectl config use-context emergency-context"
```

### Step 3: User 2 (Break-Glass Operator) Access

```bash
# Create emergency operator user (read-only + restart)
EMERGENCY_OPERATOR_TOKEN=$(kubectl create token emergency-operator-sa \
    --namespace intelgraph-prod \
    --duration=2h)

# Configure operator context
kubectl config set-credentials emergency-operator \
    --token=$EMERGENCY_OPERATOR_TOKEN

kubectl config set-context emergency-operator-context \
    --cluster=emergency-cluster \
    --user=emergency-operator \
    --namespace=intelgraph-prod

echo "🔍 Break-Glass Operator access granted for 2 hours"
echo "Monitoring access: kubectl config use-context emergency-operator-context"
```

## 🛡️ Access Permissions Matrix

| Operation         | Break-Glass Admin | Break-Glass Operator | Dual Approval Required |
| ----------------- | ----------------- | -------------------- | ---------------------- |
| Read Logs         | ✅                | ✅                   | ❌                     |
| Read Configs      | ✅                | ✅                   | ❌                     |
| Restart Pods      | ✅                | ✅                   | ❌                     |
| Scale Deployments | ✅                | ❌                   | ❌                     |
| Modify Configs    | ✅                | ❌                   | ✅                     |
| Delete Resources  | ✅                | ❌                   | ✅                     |
| Database Access   | ✅                | ❌                   | ✅                     |
| Secret Access     | ✅                | ❌                   | ✅                     |

## 🔐 Dual Approval Procedures

### For Destructive Operations

```bash
# 1. Admin initiates operation (creates pending request)
kubectl apply -f - << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: pending-operation-$(date +%s)
  namespace: intelgraph-prod
  labels:
    type: dual-approval-required
data:
  operation: "kubectl delete pod suspicious-pod-name"
  requested_by: "emergency-admin"
  requested_at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  justification: "Suspected compromised pod"
  status: "pending-operator-approval"
EOF

# 2. Operator reviews and approves
kubectl patch configmap pending-operation-$(date +%s) -n intelgraph-prod --patch='
{
  "data": {
    "status": "operator-approved",
    "approved_by": "emergency-operator",
    "approved_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }
}'

# 3. Admin executes approved operation
kubectl delete pod suspicious-pod-name -n intelgraph-prod
```

## 📊 Monitoring & Auditing

### Real-Time Break-Glass Monitoring

```bash
# Monitor break-glass access usage
kubectl get events -n intelgraph-prod \
    --field-selector reason=BreakGlassAccess \
    --watch

# Track all break-glass operations
kubectl logs -n intelgraph-prod -l app=audit-logger \
    --follow | grep "break-glass"

# Monitor resource modifications
kubectl get events -n intelgraph-prod \
    --field-selector involvedObject.kind=Pod,type=Warning \
    --watch
```

### Audit Trail Collection

```bash
# Export complete audit trail
kubectl get events -n intelgraph-prod \
    --field-selector reason=BreakGlassAccess \
    -o json > break-glass-audit-$(date +%Y%m%d-%H%M%S).json

# Database audit query
kubectl exec -n intelgraph-prod deployment/postgres -- psql -U postgres -d intelgraph -c "
SELECT
    timestamp,
    user_id,
    action,
    resource,
    success,
    justification
FROM audit_log
WHERE user_id IN ('emergency-admin', 'emergency-operator')
AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;"
```

## 🔄 Auto-Revocation System

### Automatic Cleanup (2 Hour Timer)

```bash
# Check auto-revocation status
kubectl get cronjob break-glass-cleanup -n intelgraph-prod

# Manual revocation (emergency)
kubectl delete serviceaccount emergency-admin-sa -n intelgraph-prod
kubectl delete serviceaccount emergency-operator-sa -n intelgraph-prod

# Clean up temporary resources
kubectl delete configmap -n intelgraph-prod -l type=dual-approval-required
kubectl delete job break-glass-activation -n intelgraph-prod
```

### Revocation Verification

```bash
# Verify access revoked
kubectl auth can-i "*" "*" --as=system:serviceaccount:intelgraph-prod:emergency-admin-sa
kubectl auth can-i "*" "*" --as=system:serviceaccount:intelgraph-prod:emergency-operator-sa

# Should return "no" for both
echo "Break-glass access successfully revoked ✅"
```

## 🚨 Emergency Break-Glass Commands

### Critical System Recovery

```bash
# Emergency database recovery
kubectl exec -n intelgraph-prod deployment/postgres -- \
    pg_ctl restart -D /var/lib/postgresql/data

# Emergency service restart (all services)
kubectl rollout restart deployment --all -n intelgraph-prod

# Emergency network policy reset
kubectl delete networkpolicy --all -n intelgraph-prod

# Emergency resource scaling
kubectl scale deployment intelgraph --replicas=10 -n intelgraph-prod
```

### Security Incident Response

```bash
# Isolate suspected compromised pod
kubectl patch pod suspicious-pod -p '{"spec":{"hostNetwork":false}}'
kubectl patch pod suspicious-pod -p '{"spec":{"dnsPolicy":"None"}}'

# Enable verbose audit logging
kubectl patch configmap audit-policy -n kube-system --patch='
{
  "data": {
    "audit-policy.yaml": "apiVersion: audit.k8s.io/v1\nkind: Policy\nrules:\n- level: Metadata\n  namespaces: [\"intelgraph-prod\"]\n  resources:\n  - group: \"\"\n    resources: [\"*\"]\n"
  }
}'

# Capture network traffic
kubectl exec -n intelgraph-prod suspicious-pod -- tcpdump -w /tmp/capture.pcap
```

## 📋 Post-Break-Glass Procedures

### Mandatory Post-Incident Actions

1. **Document All Actions**

   ```bash
   # Generate incident report
   kubectl logs -n intelgraph-prod -l app=audit-logger | \
       grep break-glass > incident-actions-$(date +%Y%m%d).log
   ```

2. **Security Review**
   - Review all break-glass actions for policy compliance
   - Verify no unauthorized access or data exposure
   - Update incident response procedures if needed

3. **System Hardening**
   - Rotate any secrets that may have been exposed
   - Review and update access controls
   - Patch any vulnerabilities discovered during incident

### 48-Hour Follow-Up

```bash
# Check for any lingering emergency access
kubectl get serviceaccounts -n intelgraph-prod | grep emergency

# Verify normal authentication restored
curl -f https://auth.intelgraph.ai/health

# Confirm audit trail integrity
kubectl exec -n intelgraph-prod deployment/postgres -- psql -U postgres -d intelgraph -c "
SELECT COUNT(*) FROM audit_log WHERE user_id LIKE 'emergency-%';"
```

## 🔍 Break-Glass Testing

### Monthly Validation (Required)

```bash
# Test break-glass activation (dry run)
export DRY_RUN=true
./scripts/test-break-glass-procedures.sh

# Verify dual approval workflow
./scripts/test-dual-approval.sh

# Validate auto-revocation timing
./scripts/test-auto-revocation.sh
```

**Runbook Owner:** Security & SRE Teams
**Last Updated:** September 23, 2025
**Next Review:** October 23, 2025
**Emergency Hotline:** +1-555-0199 (24/7)
