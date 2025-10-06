# CI Scopes & Release Gate Runbook

**Purpose**: Operational guide for CI scopes and OPA-based release gate enforcement

**Owner**: SRE + Release Engineering
**Status**: Production (October 2025 delivery)

---

## Overview

The release gate enforces fail-closed policy validation before any code reaches production. All releases must pass OPA policy checks covering:

- Required CI checks (status, tests)
- Required artifacts (SBOM, provenance, Grafana dashboards)
- Security gates (CodeQL, Trivy, Gitleaks)
- Zero critical vulnerabilities (or approved waivers)

---

## CI Scopes

### 1. Policy Check: Release Gate

**Workflow**: `.github/workflows/policy.check.release-gate.yml`

**Triggers**:
- Pull requests to `main`
- Pushes to `main` branch
- Git tags
- Release publications
- Manual workflow dispatch

**Inputs Validated**:
```yaml
ci_status: "success" | "failure"
tests_passed: true | false
sbom_present: true | false
provenance_present: true | false
grafana_json_committed: true | false
security_scans:
  codeql: "pass" | "fail"
  trivy: "pass" | "fail"
  gitleaks: "pass" | "fail"
critical_vulnerabilities: 0
```

**Policy**: `policies/release_gate.rego`

**Enforcement**: Fail-closed (deny by default)

---

### 2. SBOM + Provenance Generation

**Workflow**: `.github/workflows/build-sbom-provenance.yml`

**Triggers**:
- Pushes to `main`
- Tags
- Pull requests
- Releases

**Artifacts Generated**:
- `sbom.json` (CycloneDX JSON)
- `sbom.xml` (CycloneDX XML)
- `provenance.json` (SLSA v0.2)
- `checksums.txt` (SHA256 hashes)

**Retention**: 90 days (artifacts), permanent (releases)

---

### 3. Security Scans (CodeQL/Trivy/Gitleaks)

**Workflow**: `.github/workflows/security-scans-sarif.yml`

**Triggers**:
- Pull requests
- Pushes to `main`
- Weekly schedule (Mondays 8 AM UTC)

**Scans Performed**:
1. **CodeQL** - JavaScript/TypeScript + Python (security-extended queries)
2. **Trivy Filesystem** - Dependencies + OS packages (CRITICAL, HIGH, MEDIUM)
3. **Trivy Config** - IaC misconfigurations (CRITICAL, HIGH)
4. **npm audit** - Node.js dependency vulnerabilities
5. **Gitleaks** - Secret detection

**SARIF Upload**: All results uploaded to GitHub Code Scanning

**Failure Condition**: `critical_vulns > 0` AND no active waiver

---

### 4. k6 Synthetics Suite

**Workflow**: `.github/workflows/k6-golden-flow.yml`

**Triggers**:
- Pull requests
- Pushes to `main`
- Nightly schedule (2 AM UTC)

**Tests**:
- Login flow (SLO: <2s)
- Query graph data (SLO: <1.5s)
- Render visualization (SLO: <3s)
- Export with provenance (SLO: <5s)

**Thresholds**:
- API p95 latency: <1.5s
- Golden flow success rate: >99%
- HTTP error rate: <1%

**Alerts**: Slack (#alerts) on threshold breach (nightly only)

---

### 5. Golden Path E2E

**Workflow**: `.github/workflows/e2e-golden-path.yml`

**Triggers**:
- Pull requests
- Pushes to `main`
- Daily schedule (6 AM UTC)
- Manual dispatch

**Services**:
- OPA (port 8181)
- Neo4j (ports 7687, 7474)

**Test Flow**:
1. Seed test data (3 entities, 2 relationships)
2. Execute NL→Cypher query
3. Attempt export without step-up (expect 403)
4. Get step-up authentication token
5. Attempt export with step-up (expect 200)
6. Verify audit/provenance entries
7. Verify OPA policy outcomes

**Proof Artifacts** (8 files in `e2e-proof/`):
- `01_seed_response.json`
- `02_query_response.json`
- `03a_export_blocked.json`
- `03c_export_allowed.json`
- `04_audit_logs.json`
- `05_provenance.json`
- `06_opa_deny.json`
- `06_opa_allow.json`

---

## Release Gate Policy

### Policy File

**Location**: `policies/release_gate.rego`

### Rules

```rego
# Default deny
default allow := false

# Allow if ALL conditions met
allow if {
    required_checks_pass
    required_artifacts_present
    security_gates_pass
    no_critical_vulnerabilities
}

# Required CI checks must be green
required_checks_pass if {
    input.ci_status == "success"
    input.tests_passed == true
}

# Required artifacts must be present
required_artifacts_present if {
    input.sbom_present == true
    input.provenance_present == true
    input.grafana_json_committed == true
}

# Security gates must pass
security_gates_pass if {
    input.security_scans.codeql == "pass"
    input.security_scans.trivy == "pass"
    input.security_scans.gitleaks == "pass"
}

# No critical vulnerabilities (or approved waiver)
no_critical_vulnerabilities if {
    input.critical_vulnerabilities == 0
}

# Denial reasons with appeal path
denial_reason := reason if {
    not required_checks_pass
    reason := {
        "category": "ci_checks_failed",
        "message": "Required CI checks did not pass. Ensure all tests are green.",
        "appeal_path": "Contact Release Engineering if blocking is incorrect."
    }
}
```

### Violation Handling

**If policy denies**:
1. PR/push is blocked with detailed violation message
2. Violation includes:
   - Category (ci_checks_failed, missing_artifacts, security_gate_failed, critical_vulns)
   - Message with specific failure
   - Appeal path for exceptions
3. Audit record created with policy decision + inputs

**Appeal Process**:
1. Create issue with label `release-gate-appeal`
2. Include: PR/tag URL, violation message, justification
3. Release Engineering reviews within 4 hours
4. If approved: temporary waiver granted, issue linked in release notes

---

## Common Scenarios

### Scenario 1: PR Blocked Due to Missing SBOM

**Symptom**: PR fails with "Required artifacts not present"

**Diagnosis**:
```bash
# Check if SBOM workflow ran
gh run list --workflow=build-sbom-provenance.yml --limit 5

# Check artifacts
gh run view <run-id> --log | grep "Upload SBOM"
```

**Resolution**:
1. Verify `package.json` exists and is valid
2. Re-trigger SBOM workflow:
   ```bash
   gh workflow run build-sbom-provenance.yml --ref <branch>
   ```
3. Wait for workflow completion (~2 minutes)
4. Re-run release gate check

---

### Scenario 2: Critical Vulnerability Blocks Release

**Symptom**: Release gate fails with "Critical vulnerabilities found"

**Diagnosis**:
```bash
# View security scan results
gh run list --workflow=security-scans-sarif.yml --limit 1
gh run view <run-id> --log | grep "CRITICAL"

# Check Code Scanning alerts
gh api repos/BrianCLong/summit/code-scanning/alerts \
  --jq '.[] | select(.rule.security_severity_level == "critical")'
```

**Resolution Options**:

**Option A: Fix vulnerability**
1. Update dependency: `npm update <package>`
2. Commit fix
3. Re-run security scans

**Option B: Request waiver** (if fix not available)
1. Document in `SECURITY_WAIVERS.md`:
   ```markdown
   | WAV-001 | CVE-2025-1234 | CRITICAL | lodash@4.17.0 | No patch available; risk mitigated by WAF rules | WAF blocking all untrusted inputs | security-team | 2025-11-01 | ACTIVE |
   ```
2. Get security team approval
3. Commit waiver
4. Re-run release gate (will pass with waiver)

---

### Scenario 3: E2E Test Fails on Policy Denial

**Symptom**: Golden Path E2E fails at step 3a (export blocked)

**Diagnosis**:
```bash
# View E2E logs
gh run list --workflow=e2e-golden-path.yml --limit 1
gh run view <run-id> --log

# Check OPA policy
curl http://localhost:8181/v1/policies/webauthn_stepup

# Download proof artifacts
gh run download <run-id> --name e2e-proof
cat e2e-proof/06_opa_deny.json | jq '.'
```

**Resolution**:
1. Verify OPA policy is loaded correctly
2. Check step-up token format:
   ```bash
   # Token should be base64-encoded JSON
   echo $STEPUP_TOKEN | base64 -d | jq '.'
   ```
3. Ensure timestamp is within 5 minutes
4. Re-run test with fresh token

---

### Scenario 4: Synthetics Alert Fires on Latency

**Symptom**: Slack alert "#alerts" shows "OPA p95 latency >500ms"

**Diagnosis**:
```bash
# Check Prometheus metrics
curl "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,rate(opa_decision_duration_seconds_bucket[5m]))"

# View Grafana panel
open "https://grafana.example.com/d/slo-core/slo-core-dashboards?viewPanel=opa-p95-latency-002"

# Check for trace exemplars (click dots on graph)
```

**Resolution**:
1. Identify slow policy: Check OPA decision logs
2. Optimize policy: Reduce loops, cache results
3. Scale OPA: Increase replicas if CPU-bound
4. Review recent changes: `git log policies/ --oneline -5`

---

## Release Checklist

**Before creating release tag**:

- [ ] All CI checks pass (green checkmarks)
- [ ] SBOM + provenance artifacts present in latest workflow run
- [ ] Security scans show 0 critical vulnerabilities (or waivers approved)
- [ ] k6 synthetics pass with SLO compliance
- [ ] Golden Path E2E generates all 8 proof artifacts
- [ ] Grafana dashboards committed with panel UIDs documented
- [ ] Release gate policy evaluates to `allow: true`
- [ ] No blocking issues with label `release-blocker`

**Create release**:
```bash
# Tag with release version
git tag -a 2025.10.HALLOWEEN -m "October 2025 Release"
git push origin 2025.10.HALLOWEEN

# Release gate workflow will run automatically
# Monitor: gh run watch

# If approved, create GitHub release
gh release create 2025.10.HALLOWEEN \
  --title "October 2025 Release" \
  --notes-file docs/RELEASE_NOTES_2025.10.HALLOWEEN.md \
  --verify-tag
```

**Post-release**:
- [ ] Verify SBOM + provenance attached to release
- [ ] Verify release notes complete (all sections filled)
- [ ] Update Project #8 with release tag
- [ ] Send announcement to #releases Slack channel

---

## Troubleshooting

### Policy Evaluation Debug

**Check policy inputs**:
```bash
# View workflow run inputs
gh run view <run-id> --log | grep "OPA Input"
```

**Test policy locally**:
```bash
# Install OPA
brew install opa

# Evaluate policy with test input
opa eval -d policies/release_gate.rego -i test_input.json "data.release_gate.allow"

# Example test_input.json:
cat > test_input.json <<EOF
{
  "ci_status": "success",
  "tests_passed": true,
  "sbom_present": true,
  "provenance_present": true,
  "grafana_json_committed": true,
  "security_scans": {
    "codeql": "pass",
    "trivy": "pass",
    "gitleaks": "pass"
  },
  "critical_vulnerabilities": 0
}
EOF
```

**Expected output**:
```json
{
  "result": [
    {
      "expressions": [
        {
          "value": true,
          "text": "data.release_gate.allow",
          "location": {"row": 1, "col": 1}
        }
      ]
    }
  ]
}
```

### Workflow Re-runs

**Re-run failed workflow**:
```bash
# List recent runs
gh run list --workflow=policy.check.release-gate.yml --limit 5

# Re-run specific run
gh run rerun <run-id>

# Re-run only failed jobs
gh run rerun <run-id> --failed
```

### Emergency Bypass (DO NOT USE IN PRODUCTION)

**ONLY for incident response with CTO approval**:

```bash
# Temporarily disable release gate
# 1. Create bypass issue
gh issue create \
  --title "[INCIDENT] Release Gate Bypass - <reason>" \
  --body "Approved by: <CTO name>\nIncident: <incident-id>\nRollback plan: <rollback-steps>" \
  --label release-gate-bypass

# 2. Apply bypass label to PR
gh pr edit <pr-number> --add-label release-gate-bypass

# 3. Policy will check for bypass label and allow
# 4. MUST remove label after incident resolved
```

---

## Metrics

**Track in Grafana dashboard**: "Release Gate Performance"

- **Policy evaluation time**: p95 <100ms
- **Release gate pass rate**: >95%
- **Appeal resolution time**: p50 <4 hours
- **False positive rate**: <2%

**Query**:
```promql
# Policy evaluation latency
histogram_quantile(0.95, rate(opa_eval_duration_seconds_bucket{policy="release_gate"}[5m]))

# Pass/fail ratio
rate(release_gate_allow_total[1h]) / rate(release_gate_total[1h])
```

---

## Contacts

- **Release Engineering**: release-eng@example.com, Slack: #release-engineering
- **Security Team**: security@example.com, Slack: #security
- **SRE On-Call**: PagerDuty: `pd schedule show sre-oncall`
- **Policy Appeals**: Create issue with label `release-gate-appeal`

---

## Related Documentation

- [SBOM Generation Workflow](/.github/workflows/build-sbom-provenance.yml)
- [Security Scans Workflow](/.github/workflows/security-scans-sarif.yml)
- [E2E Golden Path](../E2E_GOLDEN_PATH_README.md)
- [k6 Synthetics](/.github/workflows/k6-golden-flow.yml)
- [Security Waivers](/SECURITY_WAIVERS.md)
- [OPA Policy](../../policies/release_gate.rego)

---

**Last Updated**: October 4, 2025
**Version**: 1.0
**Issue**: #10074
