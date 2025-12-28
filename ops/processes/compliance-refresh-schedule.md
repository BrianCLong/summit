# Compliance Evidence Refresh Schedule

## Overview

This document defines the schedule and procedures for maintaining continuous compliance for Summit MVP-3 across all supported frameworks: SOC 2, FedRAMP, PCI-DSS, NIST CSF, and CMMC.

## Refresh Schedule

### Daily (Automated)

| Task                             | Automation     | Owner      |
| -------------------------------- | -------------- | ---------- |
| Audit log integrity verification | CI/CD          | Platform   |
| Access log collection            | Log aggregator | Security   |
| Governance verdict statistics    | Prometheus     | Governance |
| Provenance chain verification    | Cron job       | Platform   |

### Weekly

| Task                              | Day       | Owner      |
| --------------------------------- | --------- | ---------- |
| Access review report generation   | Monday    | Security   |
| Vulnerability scan results review | Tuesday   | Security   |
| Failed authentication analysis    | Wednesday | Security   |
| Governance denial trend analysis  | Thursday  | Governance |
| Compliance dashboard review       | Friday    | Compliance |

### Monthly

| Task                             | Week   | Owner      |
| -------------------------------- | ------ | ---------- |
| Control effectiveness review     | Week 1 | Compliance |
| Policy document review           | Week 2 | Governance |
| Evidence collection verification | Week 3 | Compliance |
| Vendor risk assessment updates   | Week 4 | Security   |

### Quarterly

| Task                          | Month          | Owner       |
| ----------------------------- | -------------- | ----------- |
| Full compliance assessment    | Q1, Q2, Q3, Q4 | Compliance  |
| Penetration testing           | Q2, Q4         | Security    |
| Business continuity test      | Q1, Q3         | Operations  |
| Access certification campaign | Q1, Q3         | HR/Security |
| Framework mapping review      | Q2, Q4         | Compliance  |

### Annual

| Task                    | Month    | Owner            |
| ----------------------- | -------- | ---------------- |
| SOC 2 Type II audit     | Varies   | External Auditor |
| FedRAMP assessment      | Varies   | 3PAO             |
| PCI-DSS assessment      | Varies   | QSA              |
| Risk assessment refresh | January  | Risk Management  |
| Policy annual review    | December | Legal/Compliance |

## Evidence Collection Automation

### Automated Evidence Scripts

```bash
#!/bin/bash
# scripts/collect-compliance-evidence.sh
# Run monthly or on-demand

set -euo pipefail

EVIDENCE_DIR="audit/evidence/$(date +%Y-%m)"
mkdir -p "$EVIDENCE_DIR"

echo "=== Collecting Compliance Evidence ==="
echo "Date: $(date -Iseconds)"
echo "Target: $EVIDENCE_DIR"

# 1. Access Control Evidence (CC6.1)
echo "Collecting access control evidence..."
psql -c "
  SELECT
    u.id, u.email, u.roles, u.last_login, u.created_at
  FROM users u
  ORDER BY u.created_at DESC
" -o "$EVIDENCE_DIR/user-access-list.csv" -A -F ','

psql -c "
  SELECT
    r.name, r.permissions, r.created_at
  FROM roles r
" -o "$EVIDENCE_DIR/role-definitions.csv" -A -F ','

# 2. Audit Log Evidence (CC7.1)
echo "Collecting audit log evidence..."
psql -c "
  SELECT
    COUNT(*) as total_events,
    event_type,
    DATE(created_at) as date
  FROM audit_events
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY event_type, DATE(created_at)
  ORDER BY date DESC
" -o "$EVIDENCE_DIR/audit-log-summary.csv" -A -F ','

# 3. Governance Verdict Evidence (PI1.3)
echo "Collecting governance evidence..."
curl -s "http://localhost:9090/api/v1/query?query=sum(governance_verdicts_total)by(verdict)" \
  | jq -r '.data.result[] | [.metric.verdict, .value[1]] | @csv' \
  > "$EVIDENCE_DIR/governance-verdict-summary.csv"

# 4. Encryption Evidence
echo "Collecting encryption evidence..."
openssl s_client -connect localhost:443 2>/dev/null | \
  openssl x509 -noout -text > "$EVIDENCE_DIR/tls-certificate.txt"

# 5. Provenance Chain Evidence
echo "Collecting provenance evidence..."
curl -s "http://localhost:3000/api/v1/provenance/stats" \
  > "$EVIDENCE_DIR/provenance-stats.json"

# 6. System Configuration Evidence
echo "Collecting system configuration..."
kubectl get configmaps -o yaml > "$EVIDENCE_DIR/kubernetes-configmaps.yaml"
kubectl get networkpolicies -o yaml > "$EVIDENCE_DIR/network-policies.yaml"

# 7. Generate evidence manifest
echo "Generating evidence manifest..."
cat > "$EVIDENCE_DIR/MANIFEST.json" << EOF
{
  "collection_date": "$(date -Iseconds)",
  "collector": "$(whoami)",
  "version": "$(git describe --tags --always)",
  "files": [
$(ls -1 "$EVIDENCE_DIR" | grep -v MANIFEST | sed 's/^/    "/;s/$/"/' | paste -sd ',\n' -)
  ],
  "checksum": "$(find "$EVIDENCE_DIR" -type f -exec sha256sum {} \; | sha256sum | cut -d' ' -f1)"
}
EOF

echo "=== Evidence Collection Complete ==="
echo "Evidence stored in: $EVIDENCE_DIR"
```

### Evidence Verification

```bash
#!/bin/bash
# scripts/verify-compliance-evidence.sh

set -euo pipefail

EVIDENCE_DIR="${1:-audit/evidence/$(date +%Y-%m)}"

echo "=== Verifying Compliance Evidence ==="

# Verify manifest exists
if [[ ! -f "$EVIDENCE_DIR/MANIFEST.json" ]]; then
  echo "ERROR: MANIFEST.json not found"
  exit 1
fi

# Verify checksum
EXPECTED=$(jq -r '.checksum' "$EVIDENCE_DIR/MANIFEST.json")
ACTUAL=$(find "$EVIDENCE_DIR" -type f ! -name MANIFEST.json -exec sha256sum {} \; | sha256sum | cut -d' ' -f1)

if [[ "$EXPECTED" != "$ACTUAL" ]]; then
  echo "ERROR: Evidence integrity check failed"
  echo "Expected: $EXPECTED"
  echo "Actual: $ACTUAL"
  exit 1
fi

# Verify all required files present
REQUIRED_FILES=(
  "user-access-list.csv"
  "role-definitions.csv"
  "audit-log-summary.csv"
  "governance-verdict-summary.csv"
  "tls-certificate.txt"
  "provenance-stats.json"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [[ ! -f "$EVIDENCE_DIR/$file" ]]; then
    echo "WARNING: Required file missing: $file"
  else
    echo "OK: $file"
  fi
done

echo "=== Verification Complete ==="
```

## Audit Preparation Checklist

### 30 Days Before Audit

- [ ] Confirm audit scope and dates with auditor
- [ ] Review previous audit findings and remediation status
- [ ] Ensure all evidence collection scripts are functional
- [ ] Run full evidence collection
- [ ] Review and update System Security Plan (SSP)
- [ ] Update network diagrams if changed
- [ ] Verify all policies are current
- [ ] Schedule stakeholder interviews
- [ ] Prepare secure evidence sharing mechanism

### 14 Days Before Audit

- [ ] Run final evidence collection
- [ ] Complete self-assessment against control matrix
- [ ] Document any known gaps with remediation plans
- [ ] Prepare executive summary of compliance posture
- [ ] Brief all interview participants
- [ ] Test auditor access to systems (if applicable)
- [ ] Prepare FAQ document for common questions
- [ ] Review change log since last audit

### 7 Days Before Audit

- [ ] Final review of all documentation
- [ ] Confirm all personnel availability
- [ ] Prepare war room / interview space
- [ ] Test all demonstration environments
- [ ] Prepare daily status report template
- [ ] Assign audit liaison from each team
- [ ] Pre-stage common evidence requests

### During Audit

- [ ] Daily standup with auditor (15 min)
- [ ] Track all evidence requests and responses
- [ ] Document any findings immediately
- [ ] Escalate blockers to management
- [ ] Maintain audit log of all activities
- [ ] Prepare interim status for leadership

### Post-Audit

- [ ] Collect and archive all audit artifacts
- [ ] Receive and review draft report
- [ ] Prepare management response to findings
- [ ] Create remediation plan for gaps
- [ ] Update control matrix based on feedback
- [ ] Schedule remediation follow-up
- [ ] Update processes based on lessons learned

## Control Matrix Update Process

When regulatory frameworks change:

1. **Monitor Changes**
   - Subscribe to framework update notifications
   - Track regulatory guidance updates
   - Monitor industry best practices

2. **Impact Assessment**
   - Map new requirements to existing controls
   - Identify gaps requiring new controls
   - Assess technical implementation needs

3. **Update Documentation**
   - Update control matrix (`docs/compliance/control-matrix.md`)
   - Update implementation guides
   - Update evidence collection procedures

4. **Implement Changes**
   - Create engineering tasks for new controls
   - Update automation scripts
   - Test new evidence collection

5. **Validate**
   - Internal audit of new controls
   - Update self-assessment
   - Notify stakeholders of changes

## Framework-Specific Considerations

### SOC 2

- Focus areas: CC6 (Logical Access), CC7 (Operations)
- Evidence refresh: Continuous
- Audit window: 12 months

### FedRAMP

- Focus areas: AC, AU, IA, SC families
- POA&M tracking required
- Continuous monitoring required

### PCI-DSS

- Focus areas: Requirements 3, 7, 10
- Quarterly scans required
- Annual assessment required

### NIST CSF

- All five functions covered
- Self-assessment based
- Align with NIST 800-53

### CMMC

- Level 2 practices implemented
- Focus on CUI protection
- Third-party assessment required
