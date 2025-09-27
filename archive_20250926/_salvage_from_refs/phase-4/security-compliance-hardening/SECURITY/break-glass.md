# IntelGraph Break-Glass Procedures

## Overview

Break-glass procedures provide emergency access mechanisms for critical system recovery and incident response when normal access controls are unavailable or insufficient. These procedures balance security with operational necessity during crisis situations.

## When to Use Break-Glass Access

### Authorized Scenarios

1. **Critical System Outage**
   - Production system is completely unavailable
   - Normal administrative access is compromised
   - Customer-facing services are down

2. **Security Incident Response**
   - Active security breach requiring immediate containment
   - Compromised administrative accounts
   - Need for forensic data collection

3. **Compliance Emergency**
   - Regulatory audit requiring immediate evidence
   - Legal hold requirements
   - Data breach notification deadlines

4. **Business Continuity Events**
   - Natural disaster affecting primary infrastructure
   - Key personnel unavailability
   - Third-party service failures

### Prohibited Scenarios

- Routine maintenance or updates
- Convenience access when normal processes are available
- Bypassing change management for non-emergency changes
- Personal or unauthorized use

## Break-Glass Access Types

### Emergency Administrative Access

#### Kubernetes Cluster Access
```bash
# Emergency cluster admin access
kubectl --kubeconfig=/secure/emergency-kubeconfig.yaml get nodes

# Requires:
# - Physical access to secure workstation
# - Multi-factor authentication
# - Emergency access token
# - Incident ticket number
```

#### Database Emergency Access
```sql
-- Emergency database admin account
-- Credentials stored in secure vault
-- Access logged and monitored

USE intelgraph_prod;
SELECT 'EMERGENCY ACCESS INITIATED' AS status;
-- Emergency queries only
```

#### Cloud Platform Access
```bash
# AWS emergency access role
aws sts assume-role \
  --role-arn arn:aws:iam::ACCOUNT:role/EmergencyAccess \
  --role-session-name "emergency-$(date +%Y%m%d-%H%M%S)"

# Requires:
# - Hardware security key
# - Manager approval
# - Incident response team notification
```

### Emergency User Access

#### Privileged User Impersonation
```yaml
# Temporary user account with elevated privileges
apiVersion: v1
kind: ServiceAccount
metadata:
  name: emergency-responder
  namespace: intelgraph-prod
  annotations:
    incident.id: "INC-2025-001"
    authorized.by: "security-manager@intelgraph.com"
    expires.at: "2025-09-20T12:00:00Z"
```

## Break-Glass Activation Process

### Step 1: Authorization

```
Incident Declaration → Manager Approval → Security Team Notification
       │                     │                      │
       ├─ Severity Level     ├─ Business Impact    ├─ Break-glass Type
       ├─ Expected Duration  ├─ Approval Method    ├─ Access Scope
       └─ Justification      └─ Documentation     └─ Monitoring Setup
```

#### Authorization Matrix

| Incident Severity | Required Approvers | Notification Time | Access Duration |
|-------------------|-------------------|-------------------|-----------------|
| P0 (Critical) | Security Manager | Immediate | 4 hours |
| P1 (High) | Security Manager + CTO | 15 minutes | 2 hours |
| P2 (Medium) | Department Head | 30 minutes | 1 hour |
| Emergency | On-call Security Lead | Real-time | 30 minutes |

### Step 2: Access Provisioning

```bash
#!/bin/bash
# Emergency access provisioning script

INCIDENT_ID="$1"
RESPONDER_EMAIL="$2"
ACCESS_TYPE="$3"
DURATION="$4"

# Validate authorization
./scripts/validate-emergency-auth.sh "$INCIDENT_ID" "$RESPONDER_EMAIL"

# Provision temporary access
case "$ACCESS_TYPE" in
  "k8s-admin")
    ./scripts/provision-k8s-emergency.sh "$RESPONDER_EMAIL" "$DURATION"
    ;;
  "db-admin")
    ./scripts/provision-db-emergency.sh "$RESPONDER_EMAIL" "$DURATION"
    ;;
  "cloud-admin")
    ./scripts/provision-cloud-emergency.sh "$RESPONDER_EMAIL" "$DURATION"
    ;;
esac

# Setup monitoring and alerting
./scripts/setup-emergency-monitoring.sh "$INCIDENT_ID" "$ACCESS_TYPE"
```

### Step 3: Activation Documentation

```yaml
# Break-glass activation record
incident_id: "INC-2025-001"
timestamp: "2025-09-20T08:00:00Z"
responder:
  email: "security-lead@intelgraph.com"
  name: "Jane Smith"
  role: "Senior Security Engineer"

authorization:
  approved_by: "security-manager@intelgraph.com"
  approval_method: "Emergency Phone Call"
  incident_severity: "P0"
  business_impact: "Production system outage"

access_details:
  type: "k8s-admin"
  scope: "intelgraph-prod namespace"
  duration: "4 hours"
  expiry: "2025-09-20T12:00:00Z"

justification: |
  Critical production outage affecting all customer-facing services.
  Normal administrative access compromised due to authentication system failure.
  Emergency access required for immediate incident containment and recovery.
```

## Emergency Access Procedures

### Kubernetes Emergency Access

#### Step 1: Secure Workstation Access
```bash
# Physical access to designated emergency workstation
# Located in secure operations center
# Requires badge access + biometric verification

# Boot from secure USB with emergency tools
sudo mount /dev/sdb1 /mnt/emergency
cd /mnt/emergency/intelgraph-emergency-kit
```

#### Step 2: Emergency Kubeconfig
```bash
# Decrypt emergency kubeconfig
gpg --decrypt emergency-kubeconfig.gpg > /tmp/kubeconfig
export KUBECONFIG=/tmp/kubeconfig

# Verify cluster access
kubectl get nodes
kubectl get pods -n intelgraph-prod
```

#### Step 3: Emergency Response Actions
```bash
# Common emergency procedures

# Scale down problematic deployments
kubectl scale deployment/problematic-service --replicas=0 -n intelgraph-prod

# Access emergency runbooks
kubectl get configmap emergency-runbooks -n intelgraph-system -o yaml

# Check system health
kubectl top nodes
kubectl get events --sort-by='.lastTimestamp' -n intelgraph-prod
```

### Database Emergency Access

#### Step 1: Secure Database Connection
```bash
# Connect via emergency bastion host
ssh -i ~/.ssh/emergency-key emergency-bastion.intelgraph.com

# Connect to database with emergency credentials
psql postgresql://emergency_user:$(vault read -field=password secret/emergency/db)@db.intelgraph.com:5432/intelgraph_prod
```

#### Step 2: Emergency Database Operations
```sql
-- Check system status
SELECT
  schemaname,
  tablename,
  n_tup_ins,
  n_tup_upd,
  n_tup_del
FROM pg_stat_user_tables
ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC;

-- Emergency data recovery
BEGIN;
-- Emergency operations here
-- ROLLBACK if not needed, COMMIT if required
```

## Monitoring and Alerting

### Real-time Monitoring

```yaml
# Emergency access monitoring alerts
alerts:
  - name: BreakGlassActivated
    query: |
      rate(break_glass_access_total[5m]) > 0
    severity: critical
    annotations:
      summary: "Break-glass access activated"
      description: "Emergency access procedures have been initiated"

  - name: BreakGlassExceededDuration
    query: |
      time() - break_glass_activation_time > break_glass_max_duration
    severity: critical
    annotations:
      summary: "Break-glass access exceeded authorized duration"
```

### Audit Logging

```json
{
  "timestamp": "2025-09-20T08:00:00Z",
  "event_type": "break_glass_access",
  "incident_id": "INC-2025-001",
  "user": "security-lead@intelgraph.com",
  "access_type": "k8s-admin",
  "resource": "intelgraph-prod/deployment/api-gateway",
  "action": "kubectl scale deployment",
  "authorization": {
    "approved_by": "security-manager@intelgraph.com",
    "approval_timestamp": "2025-09-20T07:58:00Z"
  },
  "source_ip": "10.0.1.100",
  "user_agent": "kubectl/v1.28.0"
}
```

## Post-Incident Procedures

### Step 1: Access Revocation

```bash
# Automatic access revocation script
#!/bin/bash

INCIDENT_ID="$1"

# Revoke emergency Kubernetes access
kubectl delete serviceaccount emergency-responder-$INCIDENT_ID -n intelgraph-prod
kubectl delete clusterrolebinding emergency-access-$INCIDENT_ID

# Disable emergency database user
psql -c "ALTER USER emergency_user_$INCIDENT_ID NOLOGIN;"

# Revoke cloud platform access
aws iam detach-role-policy \
  --role-name EmergencyAccess-$INCIDENT_ID \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Clear temporary credentials
rm -f /tmp/kubeconfig-$INCIDENT_ID
rm -f /tmp/emergency-creds-$INCIDENT_ID
```

### Step 2: Incident Review

```yaml
# Post-incident review template
incident_id: "INC-2025-001"
break_glass_review:
  activation_justified: true
  access_scope_appropriate: true
  duration_within_limits: true
  actions_documented: true

findings:
  - "Emergency access was necessary due to authentication system failure"
  - "Access was used appropriately for incident containment"
  - "No unauthorized actions detected"

improvements:
  - "Update emergency contact procedures"
  - "Test emergency access quarterly"
  - "Improve documentation for common scenarios"

follow_up_actions:
  - task: "Review emergency access procedures"
    owner: "security-team"
    due_date: "2025-10-01"
  - task: "Update emergency runbooks"
    owner: "ops-team"
    due_date: "2025-09-30"
```

### Step 3: Evidence Collection

```bash
# Collect evidence for audit and compliance
./scripts/collect-emergency-evidence.sh INC-2025-001

# Generated evidence package includes:
# - Authorization documents
# - Access logs and audit trails
# - Actions performed during emergency access
# - System state before and after
# - Communication records
# - Post-incident review
```

## Emergency Contact Information

### Internal Contacts

```yaml
security_team:
  primary: "security-manager@intelgraph.com"
  secondary: "security-lead@intelgraph.com"
  escalation: "ciso@intelgraph.com"

operations_team:
  primary: "ops-manager@intelgraph.com"
  secondary: "sre-lead@intelgraph.com"
  escalation: "cto@intelgraph.com"

business_continuity:
  primary: "bc-manager@intelgraph.com"
  escalation: "coo@intelgraph.com"
```

### External Contacts

```yaml
cloud_providers:
  aws: "+1-800-AWS-SUPPORT"
  azure: "+1-800-642-7676"

security_vendors:
  incident_response: "ir-team@securitypartner.com"
  forensics: "forensics@digitalinvestigator.com"

legal_counsel:
  primary: "legal@lawfirm.com"
  cyber_insurance: "claims@cyberinsurer.com"
```

## Training and Testing

### Quarterly Testing

```yaml
# Break-glass procedure test scenarios
test_scenarios:
  - name: "Kubernetes cluster compromise"
    objective: "Test emergency access to recover services"
    participants: ["security", "operations", "management"]
    duration: "2 hours"

  - name: "Database corruption"
    objective: "Test emergency data recovery procedures"
    participants: ["dba", "security", "operations"]
    duration: "1 hour"

  - name: "Authentication system failure"
    objective: "Test alternative access mechanisms"
    participants: ["security", "operations"]
    duration: "30 minutes"
```

### Training Requirements

- **Annual Training**: All authorized personnel
- **Scenario Exercises**: Quarterly tabletop exercises
- **Documentation Review**: Monthly procedure updates
- **Access Testing**: Quarterly access verification

## Compliance and Audit

### SOC 2 Requirements
- **CC6.1**: Logical access controls
- **CC6.2**: Multi-factor authentication
- **CC6.3**: Network access controls
- Evidence: Emergency access logs, approval records

### ISO 27001 Requirements
- **A.9.1.2**: Access to networks and network services
- **A.16.1.5**: Response to information security incidents
- Evidence: Procedures documentation, test results

### Regulatory Requirements
- **Data Protection**: Emergency access to personal data
- **Financial Services**: Critical system recovery procedures
- **Healthcare**: Patient data access controls

## Risk Management

### Risk Mitigation

1. **Segregation of Duties**
   - Multiple approvers required
   - Different individuals for authorization and execution
   - Independent monitoring and review

2. **Time Limits**
   - Automatic access expiration
   - Regular renewal requirements
   - Escalation for extended access

3. **Monitoring and Alerting**
   - Real-time access monitoring
   - Automated anomaly detection
   - Executive notification

4. **Evidence Collection**
   - Comprehensive audit trails
   - Video recording of emergency operations
   - Documentation requirements

### Residual Risks

- **Insider Threat**: Authorized personnel misusing access
- **Social Engineering**: Fraudulent authorization requests
- **Technical Failure**: Emergency systems unavailable
- **Collusion**: Multiple authorized personnel collaborating

**Last Updated**: September 2025
**Next Review**: December 2025
**Owner**: Security Team