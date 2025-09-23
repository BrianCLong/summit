# IntelGraph Incident Response Playbooks

## Table of Contents
1. [Overscoped Export Incident](#overscoped-export-incident)
2. [Prompt Injection Attack](#prompt-injection-attack) 
3. [Kafka Lag Spike](#kafka-lag-spike)
4. [Leaky Alert Webhook](#leaky-alert-webhook)
5. [Model Drift Emergency](#model-drift-emergency)
6. [Security Breach](#security-breach)
7. [Data Corruption](#data-corruption)
8. [Service Outage](#service-outage)

---

## 1. Overscoped Export Incident

**Scenario**: User exports data they should not have access to, or export contains sensitive cross-tenant information.

### Severity Classification
- **P1 (Critical)**: Cross-tenant data leak, classified information exposed
- **P2 (High)**: Single-tenant overscope with PII
- **P3 (Medium)**: Minor permission boundary violation
- **P4 (Low)**: Audit trail investigation needed

### Immediate Response (0-15 minutes)

#### 🚨 Detection & Alerting
```bash
# Alert triggers from OPA policy violations
ALERT: Export Policy Violation
- User: user@example.com
- Export ID: export_1234567890_abc123
- Violation: cross_tenant_access_denied
- Resources: investigation-456, case-789
- Timestamp: 2024-08-27T14:30:00Z
```

#### 🔒 Containment Actions
1. **Immediate containment**:
   ```bash
   # Revoke export download link
   curl -X DELETE https://api.intelgraph.com/exports/export_1234567890_abc123 \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   
   # Disable user account temporarily
   curl -X PATCH https://api.intelgraph.com/users/user@example.com \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{"status": "suspended", "reason": "security_incident"}'
   ```

2. **Audit log capture**:
   ```bash
   # Capture full audit trail
   kubectl logs -l app=audit-service --since=1h | \
     grep "export_1234567890_abc123" > incident-audit.log
   
   # Extract user activity
   redis-cli --scan --pattern "access_log:*:user@example.com" | \
     xargs redis-cli MGET > user-activity.json
   ```

3. **Evidence preservation**:
   ```bash
   # Preserve export metadata
   psql -h localhost -U intelgraph -d intelgraph -c \
     "SELECT * FROM exports WHERE id = 'export_1234567890_abc123';" > export-metadata.sql
   
   # Capture OPA decision logs
   curl -X GET https://opa.intelgraph.com/v1/data/system/logs > opa-decisions.json
   ```

### Investigation Phase (15 minutes - 2 hours)

#### 🔍 Root Cause Analysis
1. **Permission review**:
   ```bash
   # Check user permissions
   curl -X GET https://api.intelgraph.com/users/user@example.com/permissions \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   
   # Review role assignments
   psql -h localhost -U intelgraph -d intelgraph -c \
     "SELECT * FROM user_roles WHERE user_id = 'user@example.com';"
   ```

2. **Export content analysis**:
   ```bash
   # Analyze exported data (if still accessible)
   intelgraph-cli analyze-export export_1234567890_abc123 \
     --check-scope --check-classification --output incident-analysis.json
   ```

3. **Timeline reconstruction**:
   ```bash
   # Build incident timeline
   intelgraph-cli timeline --user user@example.com \
     --start "2024-08-27T14:00:00Z" --end "2024-08-27T15:00:00Z" \
     --include-exports --include-permissions
   ```

#### 📊 Impact Assessment
```markdown
Impact Assessment Checklist:
- [ ] Data classification level exposed (Confidential/Secret/Top Secret)
- [ ] Number of affected records/entities
- [ ] Cross-tenant exposure confirmed (Y/N)
- [ ] PII/PHI included (Y/N)
- [ ] Customer/partner data involved (Y/N)
- [ ] Regulatory implications (GDPR/CCPA/HIPAA)
- [ ] Downstream systems affected
- [ ] Media/public disclosure risk
```

### Response & Recovery (2-24 hours)

#### 🛠️ Technical Remediation
1. **Policy hardening**:
   ```bash
   # Update OPA policies
   curl -X PUT https://opa.intelgraph.com/v1/policies/export \
     -H "Content-Type: text/plain" \
     --data-binary @enhanced-export-policy.rego
   
   # Add additional export controls
   kubectl apply -f export-security-hardening.yaml
   ```

2. **Access review**:
   ```bash
   # Comprehensive access review
   intelgraph-cli access-review --all-users --check-overprivilege \
     --output access-review-$(date +%Y%m%d).json
   ```

3. **Monitoring enhancement**:
   ```bash
   # Deploy enhanced monitoring
   kubectl apply -f export-monitoring-rules.yaml
   
   # Update alerting thresholds
   curl -X POST https://api.intelgraph.com/alerts/rules \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d @export-alert-rules.json
   ```

#### 📋 Communication Plan
**Internal Communications**:
- Security team notification (immediate)
- Legal team notification (if regulatory impact)
- Customer success (if customer data involved)
- Executive briefing (P1/P2 incidents)

**External Communications** (if required):
- Customer notification (within 24 hours for data exposure)
- Regulatory notification (within 72 hours for GDPR)
- Public disclosure (if legally required)

### Post-Incident Review (24-72 hours)

#### 📝 Documentation Requirements
1. **Incident report template**:
   ```markdown
   # Incident Report: Overscoped Export
   
   **Incident ID**: INC-2024-001
   **Severity**: P2
   **Status**: Resolved
   
   ## Summary
   - What: Unauthorized cross-tenant data export
   - When: 2024-08-27 14:30 UTC
   - Who: user@example.com
   - Impact: 150 records from tenant B exposed to tenant A
   
   ## Timeline
   - 14:30 - Export initiated
   - 14:31 - OPA policy violation detected
   - 14:32 - Automated alert triggered
   - 14:35 - On-call engineer paged
   - 14:45 - Export revoked, user suspended
   
   ## Root Cause
   - Permission escalation bug in role assignment logic
   - OPA policy gap for multi-tenant resource queries
   
   ## Impact
   - Data: 150 investigation records exposed
   - Systems: Export service, OPA, audit service
   - Users: 1 affected user, 3 tenant B investigations
   
   ## Resolution
   - Export revoked and deleted
   - User permissions corrected
   - Policy updated to prevent recurrence
   
   ## Lessons Learned
   - Export pre-flight checks needed
   - Cross-tenant policy testing insufficient
   - Audit alerting delayed by 5 minutes
   ```

2. **Action items**:
   ```markdown
   ## Post-Incident Action Items
   
   **Immediate (24 hours)**:
   - [ ] Deploy export pre-flight authorization checks
   - [ ] Update OPA test suite with cross-tenant scenarios
   - [ ] Implement real-time export monitoring
   
   **Short-term (1 week)**:
   - [ ] Comprehensive permission audit
   - [ ] Enhanced export UI warnings
   - [ ] Staff security training update
   
   **Long-term (1 month)**:
   - [ ] Zero-trust export architecture
   - [ ] Automated policy testing in CI/CD
   - [ ] Third-party security assessment
   ```

---

## 2. Prompt Injection Attack

**Scenario**: AI assistant compromised through sophisticated prompt injection leading to unauthorized tool calls or data access.

### Immediate Response (0-5 minutes)

#### 🚨 Detection & Alerting
```bash
ALERT: AI Security Incident
- User: attacker@external.com
- Risk Score: 0.95 (Critical)
- Detected Patterns: instruction_injection, role_manipulation, data_extraction
- Blocked Tools: export_analysis_report, get_security_alerts
- Session: session_abc123def456
```

#### 🔒 Containment Actions
1. **Immediate isolation**:
   ```bash
   # Suspend AI assistant for affected user
   curl -X POST https://api.intelgraph.com/ai/suspend \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{"user_id": "attacker@external.com", "reason": "security_incident"}'
   
   # Block session
   redis-cli SET "blocked_sessions:session_abc123def456" "1" EX 86400
   ```

2. **Tool lockdown**:
   ```bash
   # Disable high-risk AI tools system-wide
   kubectl patch configmap ai-assistant-config \
     --patch '{"data":{"tools_enabled":"false","security_mode":"lockdown"}}'
   ```

### Investigation Phase (5 minutes - 1 hour)

#### 🔍 Attack Analysis
```bash
# Extract attack vectors
intelgraph-cli ai-security analyze-attack \
  --session session_abc123def456 \
  --user attacker@external.com \
  --output attack-analysis.json

# Review prompt injection patterns
curl -X GET https://api.intelgraph.com/ai/security/incidents/latest \
  -H "Authorization: Bearer $ADMIN_TOKEN" > injection-patterns.json
```

### Response & Recovery

#### 🛠️ Technical Remediation
```bash
# Update prompt injection patterns
curl -X POST https://api.intelgraph.com/ai/security/patterns \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d @new-injection-patterns.json

# Enhanced AI monitoring
kubectl apply -f ai-security-monitoring.yaml
```

---

## 3. Kafka Lag Spike

**Scenario**: Consumer lag exceeds 1000 messages, affecting real-time alert processing.

### Immediate Response (0-2 minutes)

#### 🚨 Detection & Alerting
```bash
ALERT: Kafka Consumer Lag Critical
- Topic: intelgraph.alerts
- Consumer Group: alert-processors
- Lag: 2,847 messages
- Partition: 0
- Last Offset: 15,847
- Consumer Offset: 13,000
```

#### ⚡ Quick Diagnostics
```bash
# Check consumer group status
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group alert-processors

# Check partition details
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --topic intelgraph.alerts

# Check consumer instances
kubectl get pods -l app=alert-consumer
```

### Investigation & Response (2-15 minutes)

#### 🔍 Root Cause Identification
```bash
# Consumer performance analysis
kubectl logs -l app=alert-consumer --tail=100 | \
  grep -E "(ERROR|WARN|Exception)"

# Check resource utilization
kubectl top pods -l app=alert-consumer

# Database connection health
psql -h postgres-service -U intelgraph -c "SELECT * FROM pg_stat_activity;"
```

#### 🛠️ Immediate Fixes
```bash
# Scale up consumers (if resource constrained)
kubectl scale deployment alert-consumer --replicas=6

# Restart stuck consumers
kubectl rollout restart deployment alert-consumer

# Clear consumer group if needed (emergency only)
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --reset-offsets --group alert-processors --topic intelgraph.alerts \
  --to-latest --execute
```

---

## 4. Leaky Alert Webhook

**Scenario**: Webhook endpoint leaking sensitive alert data to unauthorized external service.

### Immediate Response (0-5 minutes)

#### 🚨 Detection Indicators
- Unusual outbound traffic patterns
- Webhook response anomalies
- Security scanning alerts
- Third-party data breach notification

#### 🔒 Immediate Containment
```bash
# Disable all webhooks immediately
kubectl patch configmap webhook-config \
  --patch '{"data":{"webhooks_enabled":"false"}}'

# Block suspicious outbound traffic
iptables -I OUTPUT -d suspicious-endpoint.com -j DROP

# Revoke webhook authentication tokens
curl -X DELETE https://api.intelgraph.com/webhooks/tokens/all \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Investigation Phase

#### 🔍 Traffic Analysis
```bash
# Analyze webhook logs
grep "webhook" /var/log/intelgraph/app.log | \
  grep -E "(ERROR|leak|unauthorized)" > webhook-incident.log

# Network traffic analysis
tcpdump -i any -w webhook-traffic.pcap \
  'host suspicious-endpoint.com and port 443'
```

---

## 5. Model Drift Emergency

**Scenario**: Critical ML model shows severe drift (>0.7 score) affecting investigation accuracy.

### Immediate Response (0-10 minutes)

#### 🚨 Detection & Response
```bash
ALERT: Model Drift Critical
- Model: threat-classification-v2.1
- Drift Score: 0.82
- Affected Features: network_patterns, user_behavior
- Performance Drop: 15% accuracy decline
- Recommended Action: rollback
```

#### 🔄 Emergency Rollback
```bash
# Immediate model rollback
intelgraph-cli mlops rollback threat-classification-v2.1 \
  --to-version v2.0 --reason "critical_drift_emergency"

# Verify rollback success
curl -X GET https://api.intelgraph.com/models/threat-classification/status
```

### Investigation & Recovery

#### 🔍 Drift Analysis
```bash
# Comprehensive drift analysis
intelgraph-cli mlops analyze-drift threat-classification-v2.1 \
  --detailed --output drift-analysis.json

# Data quality assessment
intelgraph-cli data quality-check --model threat-classification-v2.1 \
  --timerange "7d" --output data-quality-report.json
```

---

## 6. Security Breach

**Scenario**: Unauthorized access detected, potential data exfiltration in progress.

### Immediate Response (0-5 minutes)

#### 🚨 Breach Indicators
- Multiple failed authentication attempts
- Unusual data access patterns
- Privilege escalation attempts
- Suspicious network traffic

#### 🔒 Emergency Lockdown
```bash
# Enable emergency security mode
kubectl apply -f emergency-lockdown.yaml

# Force all user re-authentication
redis-cli FLUSHDB 1  # Clear session cache

# Block suspicious IP addresses
for ip in $(cat suspicious-ips.txt); do
  iptables -I INPUT -s $ip -j DROP
done

# Disable external integrations
kubectl patch configmap integration-config \
  --patch '{"data":{"integrations_enabled":"false"}}'
```

### Investigation Phase

#### 🔍 Forensic Investigation
```bash
# Capture system state
intelgraph-cli forensics capture-state \
  --output forensics-$(date +%Y%m%d-%H%M%S).tar.gz

# Analyze access logs
intelgraph-cli forensics analyze-access \
  --timerange "24h" --suspicious-only

# Database integrity check
intelgraph-cli forensics check-integrity \
  --all-tables --check-hashes
```

---

## 7. Tabletop Exercise Scenarios

### Exercise 1: "Operation NIGHTFALL"

**Scenario**: Multi-vector attack combining prompt injection, export overscoping, and model manipulation.

**Timeline**: 90 minutes
**Participants**: Security team, Engineering, Legal, Management
**Objectives**:
- Test incident coordination
- Validate technical response procedures  
- Assess communication protocols
- Identify gaps in detection/response

**Scenario Injection Points**:
```
T+0:    AI assistant compromise detected
T+15:   Cross-tenant data export initiated  
T+30:   Model drift alerts triggered
T+45:   Media inquiry received
T+60:   Regulatory notification deadline approaches
T+75:   Customer complaints escalate
```

**Success Metrics**:
- Detection time < 5 minutes
- Containment time < 15 minutes
- Internal communication < 30 minutes
- Customer notification < 4 hours
- Full remediation < 24 hours

### Exercise 2: "Operation BLACKOUT"

**Scenario**: Cascading system failure affecting multiple services.

**Components**:
- Kafka cluster failure
- Database connection pool exhaustion
- AI service unavailability  
- Export system overload
- Monitoring system blind spots

**Focus Areas**:
- Service dependency mapping
- Graceful degradation
- Recovery prioritization
- Business continuity
- Post-incident learning

### Exercise 3: "Operation DISCLOSURE"

**Scenario**: Regulatory compliance incident requiring complex legal coordination.

**Elements**:
- GDPR Article 33 notification required
- Customer PII exposure confirmed
- Multi-jurisdiction legal requirements
- Media attention and PR management
- Executive crisis management

---

## 8. Emergency Contacts & Escalation

### On-Call Rotation
```
Primary:    security-oncall@intelgraph.com
Secondary:  engineering-oncall@intelgraph.com  
Escalation: director-engineering@intelgraph.com
Executive:  cto@intelgraph.com
Legal:      legal@intelgraph.com
PR:         communications@intelgraph.com
```

### External Contacts
```
Cloud Provider: support.google.com/contact (P1 Support)
Kubernetes:     support.k8s.io
Legal Counsel:  external-legal@lawfirm.com
Cyber Insurance: claims@cyberinsurance.com
Law Enforcement: fbi.gov/report-cyber-crime
```

### Communication Channels
```
Slack:      #incident-response
War Room:   zoom.us/j/emergency-room
Status:     status.intelgraph.com  
Docs:       confluence.intelgraph.com/incidents
Tickets:    jira.intelgraph.com/incident
```

---

## 9. Runbook Maintenance

### Quarterly Reviews
- [ ] Update contact information
- [ ] Test emergency procedures  
- [ ] Review lessons learned
- [ ] Update technical procedures
- [ ] Validate external dependencies

### Annual Exercises
- [ ] Full-scale tabletop exercise
- [ ] Cross-team coordination drill
- [ ] Executive crisis simulation
- [ ] External party coordination
- [ ] Media response training

### Continuous Improvement
- Post-incident playbook updates
- Automation enhancement
- Detection improvement
- Response time optimization
- Training program updates

---

*This document is classified as INTERNAL USE and should be accessible to authorized incident responders only. Last updated: 2024-08-27*