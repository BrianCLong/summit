# Threat Model Delta - October 2025

**Purpose**: Document security improvements and threat landscape changes for October 2025 delivery

**Owner**: Security Engineering Team
**Status**: Complete
**Release**: 2025.10.HALLOWEEN

---

## Executive Summary

This document captures security enhancements introduced in the October 2025 release, including:

- **OPA-based release gate** with fail-closed enforcement
- **WebAuthn step-up authentication** for risky operations
- **SBOM + SLSA provenance** for supply chain integrity
- **Comprehensive security scanning** (CodeQL, Trivy, Gitleaks) with SARIF
- **E2E validation** with proof artifacts and audit trails

**Risk Posture**: Significantly improved from baseline

**New Controls**: 12 new security controls implemented

**Mitigated Threats**: 8 high-severity threat scenarios addressed

---

## Threat Model Updates

### New Threats Identified

#### T-OCT-01: Malicious Release Without Security Validation

**Severity**: Critical
**Likelihood**: Medium → Low (after mitigation)

**Description**: Attacker with commit access pushes malicious code that bypasses security checks and reaches production.

**Previous State**:

- Manual security review (inconsistent)
- No automated policy enforcement
- Security scans run but non-blocking

**October 2025 Improvements**:

- ✅ **OPA Release Gate** - Fail-closed policy enforcement
  - **Control**: `policies/release_gate.rego`
  - **Enforcement**: GitHub Actions workflow blocks PRs/releases
  - **Validation**: CI status, tests, SBOM, provenance, security scans, critical vulns
  - **Bypass**: Requires CTO approval + incident issue + post-incident review

**Residual Risk**: Low

- Bypass mechanism exists but requires high-level approval and audit trail
- Policy inputs could be tampered with (requires GitHub Actions access)

**Recommendations**:

- [ ] Implement signed policy inputs with attestation
- [ ] Add anomaly detection for bypass usage patterns

---

#### T-OCT-02: Privilege Escalation via Risky Route Exploitation

**Severity**: High
**Likelihood**: High → Low (after mitigation)

**Description**: Attacker with valid session token performs risky operations (export, delete, admin actions) without additional authentication.

**Previous State**:

- Single-factor authentication (session token only)
- No step-up authentication for sensitive operations
- All authenticated users could perform risky actions

**October 2025 Improvements**:

- ✅ **WebAuthn Step-Up Authentication**
  - **Control**: `policies/webauthn_stepup.rego` + `backend/middleware/webauthn-stepup.js`
  - **Protected Routes**: `/api/export`, `/api/delete`, `/api/admin/*`, `/api/graphql/mutation/delete*`
  - **Enforcement**: OPA policy + middleware interceptor (fail-closed)
  - **User Experience**: Modal prompt with biometric/security key auth
  - **Timeout**: 5 minutes (configurable)

**Residual Risk**: Low

- WebAuthn implementation complexity (potential bugs)
- User friction (may lead to support tickets)

**Recommendations**:

- [ ] Security audit of WebAuthn implementation
- [ ] Add session binding to prevent token replay
- [ ] Monitor step-up success/failure rates for anomalies

---

#### T-OCT-03: Supply Chain Compromise via Dependency Injection

**Severity**: Critical
**Likelihood**: Medium (unchanged, but detection improved)

**Description**: Attacker injects malicious dependency that compromises build artifacts or runtime behavior.

**Previous State**:

- No SBOM generation
- No provenance attestation
- Manual dependency review (inconsistent)
- npm audit run but results not enforced

**October 2025 Improvements**:

- ✅ **SBOM + Provenance Generation**
  - **Control**: `.github/workflows/build-sbom-provenance.yml`
  - **SBOM**: CycloneDX format (JSON + XML)
  - **Provenance**: SLSA v0.2 attestation with builder metadata
  - **Hashes**: SHA256 checksums for all artifacts
  - **Distribution**: Attached to GitHub releases, verifiable

- ✅ **Enhanced Security Scanning**
  - **Control**: `.github/workflows/security-scans-sarif.yml`
  - **CodeQL**: Detects vulnerable code patterns
  - **Trivy**: Scans dependencies + OS packages (CRITICAL, HIGH, MEDIUM)
  - **npm audit**: Node.js vulnerabilities
  - **Gitleaks**: Detects secrets in code
  - **Enforcement**: Fail on critical vulnerabilities without waiver

**Residual Risk**: Medium

- Zero-day vulnerabilities in dependencies (no patch available)
- Supply chain attacks at build time (compromised GitHub Actions)

**Recommendations**:

- [ ] Implement binary attestation for build artifacts
- [ ] Add SLSA provenance verification at deployment
- [ ] Enable GitHub Actions OIDC token verification
- [ ] Implement hermetic builds with reproducible artifacts

---

#### T-OCT-04: Policy Bypass via Input Manipulation

**Severity**: High
**Likelihood**: Medium → Low (after mitigation)

**Description**: Attacker manipulates OPA policy inputs to bypass security controls (e.g., fake CI status, false security scan results).

**Previous State**:

- Policy inputs not validated
- No integrity checks on policy data
- Inputs sourced from potentially untrusted workflow outputs

**October 2025 Improvements**:

- ✅ **Policy Input Validation**
  - **Control**: OPA policies validate input structure and types
  - **Source Verification**: Inputs sourced from trusted GitHub Actions contexts
  - **Audit Trail**: All policy evaluations logged with inputs + outputs

**Residual Risk**: Medium

- GitHub Actions runner compromise could fake inputs
- No cryptographic verification of input integrity

**Recommendations**:

- [ ] Implement signed policy inputs with GitHub OIDC tokens
- [ ] Add input attestation with Sigstore/Cosign
- [ ] Monitor for anomalous policy input patterns

---

#### T-OCT-05: Insider Threat - Unauthorized Data Exfiltration

**Severity**: High
**Likelihood**: Medium → Low (after mitigation)

**Description**: Insider with access to sensitive data exports it without authorization or audit trail.

**Previous State**:

- Export operations logged but no policy enforcement
- No DLP controls on export data
- Audit logs not linked to policy decisions

**October 2025 Improvements**:

- ✅ **WebAuthn Step-Up for Export**
  - **Control**: Export routes require step-up authentication
  - **Enforcement**: `policies/webauthn_stepup.rego` blocks exports without step-up
  - **Audit**: Every export logged with step-up attestation reference

- ✅ **DLP Policy Bindings**
  - **Control**: OPA policies check for sensitive data patterns
  - **Detection**: PII, credentials, secrets in export payloads
  - **Action**: Block export, alert security team

- ✅ **Provenance Trail**
  - **Control**: E2E test validates provenance attached to exports
  - **Verification**: Proof artifacts show audit log → provenance linkage

**Residual Risk**: Low

- DLP rules may have false negatives (missed patterns)
- Insider could use step-up auth legitimately then exfiltrate

**Recommendations**:

- [ ] Add behavioral analytics for export patterns
- [ ] Implement data masking/redaction for exports
- [ ] Rate limit exports per user/role

---

### Mitigated Threats

| Threat ID     | Description                           | Previous Severity | Mitigated By                        | Residual Risk |
| ------------- | ------------------------------------- | ----------------- | ----------------------------------- | ------------- |
| T-OCT-01      | Malicious release without validation  | Critical          | OPA Release Gate                    | Low           |
| T-OCT-02      | Privilege escalation via risky routes | High              | WebAuthn Step-Up                    | Low           |
| T-OCT-03      | Supply chain compromise               | Critical          | SBOM + Provenance + Scanning        | Medium        |
| T-OCT-04      | Policy bypass via input manipulation  | High              | Input validation + Audit            | Medium        |
| T-OCT-05      | Insider data exfiltration             | High              | Step-Up + DLP + Provenance          | Low           |
| T-BASELINE-06 | Undetected security vulnerabilities   | High              | CodeQL + Trivy + Gitleaks           | Low           |
| T-BASELINE-07 | SLO violations without alerting       | Medium            | Prometheus alerts + Trace exemplars | Low           |
| T-BASELINE-08 | Untraceable performance issues        | Medium            | k6 synthetics + E2E validation      | Low           |

---

## New Security Controls

### 1. OPA Release Gate (Fail-Closed)

**Control ID**: CTRL-OCT-01
**Type**: Preventive
**Implementation**: `policies/release_gate.rego` + `.github/workflows/policy.check.release-gate.yml`

**Threat Coverage**:

- T-OCT-01 (Malicious release)
- T-BASELINE-06 (Undetected vulnerabilities)

**Validation**:

- ✅ PR with missing SBOM is blocked
- ✅ PR with critical vulnerability is blocked
- ✅ Bypass requires CTO approval + incident issue

**STRIDE Mapping**:

- **Tampering**: Prevents malicious code from reaching production
- **Elevation of Privilege**: Requires policy compliance for release

---

### 2. WebAuthn Step-Up Authentication

**Control ID**: CTRL-OCT-02
**Type**: Preventive + Detective
**Implementation**: `policies/webauthn_stepup.rego` + `backend/middleware/webauthn-stepup.js` + `frontend/components/StepUpAuthModal.tsx`

**Threat Coverage**:

- T-OCT-02 (Privilege escalation)
- T-OCT-05 (Insider exfiltration)

**Validation**:

- ✅ Export without step-up returns 403
- ✅ Export with step-up succeeds + audit logged
- ✅ Audit contains attestation reference

**STRIDE Mapping**:

- **Elevation of Privilege**: Requires additional authentication for sensitive operations
- **Repudiation**: Audit trail with attestation prevents denial

---

### 3. SBOM + SLSA Provenance

**Control ID**: CTRL-OCT-03
**Type**: Detective
**Implementation**: `.github/workflows/build-sbom-provenance.yml`

**Threat Coverage**:

- T-OCT-03 (Supply chain compromise)

**Validation**:

- ✅ SBOM generated for every release (CycloneDX JSON + XML)
- ✅ Provenance attestation with SLSA v0.2 metadata
- ✅ SHA256 hashes for all artifacts

**STRIDE Mapping**:

- **Tampering**: Detects unauthorized changes to dependencies
- **Repudiation**: Provenance proves build origin and integrity

---

### 4. Comprehensive Security Scanning (SARIF)

**Control ID**: CTRL-OCT-04
**Type**: Detective
**Implementation**: `.github/workflows/security-scans-sarif.yml` + `SECURITY_WAIVERS.md`

**Threat Coverage**:

- T-OCT-03 (Supply chain compromise)
- T-BASELINE-06 (Undetected vulnerabilities)

**Validation**:

- ✅ CodeQL, Trivy, npm audit, Gitleaks run on every PR
- ✅ SARIF uploaded to GitHub Code Scanning
- ✅ Critical vulnerabilities block release (unless waiver approved)

**STRIDE Mapping**:

- **Tampering**: Detects vulnerable code and dependencies
- **Information Disclosure**: Identifies secrets in code

---

### 5. Golden Path E2E Validation

**Control ID**: CTRL-OCT-05
**Type**: Detective + Corrective
**Implementation**: `scripts/e2e/golden-path.sh` + `.github/workflows/e2e-golden-path.yml`

**Threat Coverage**:

- T-OCT-02 (Privilege escalation)
- T-OCT-04 (Policy bypass)
- T-OCT-05 (Insider exfiltration)

**Validation**:

- ✅ E2E test validates seed → query → export → audit/provenance flow
- ✅ 8 proof artifacts generated per run
- ✅ Policy outcomes verified (block without step-up, allow with step-up)

**STRIDE Mapping**:

- **Elevation of Privilege**: Validates policy enforcement end-to-end
- **Repudiation**: Proof artifacts provide evidence of correct behavior

---

### 6. SLO Alerts + Trace Exemplars

**Control ID**: CTRL-OCT-06
**Type**: Detective
**Implementation**: `observability/prometheus/alerts/slo-alerts.yml` + Grafana dashboards with trace exemplars

**Threat Coverage**:

- T-BASELINE-07 (SLO violations)
- T-BASELINE-08 (Untraceable performance issues)

**Validation**:

- ✅ Alerts fire on SLO violations (API latency, OPA latency, queue lag, ingest failures, golden flow failures)
- ✅ Trace exemplars enable root cause analysis
- ✅ Alertmanager routes to Slack/PagerDuty

**STRIDE Mapping**:

- **Denial of Service**: Detects performance degradation
- **Information Disclosure**: Trace exemplars reveal performance bottlenecks

---

### 7. k6 Synthetics Suite

**Control ID**: CTRL-OCT-07
**Type**: Detective
**Implementation**: `tests/k6/golden-flow.k6.js` + `.github/workflows/k6-golden-flow.yml`

**Threat Coverage**:

- T-BASELINE-08 (Untraceable performance issues)

**Validation**:

- ✅ Golden flow tested on every PR and nightly
- ✅ Thresholds enforce SLO compliance (API p95 <1.5s, golden flow success >99%)
- ✅ Alerts on threshold breach

**STRIDE Mapping**:

- **Denial of Service**: Detects performance regressions before production

---

### 8. DLP Policy Bindings

**Control ID**: CTRL-OCT-08
**Type**: Preventive
**Implementation**: `policies/webauthn_stepup.rego` (DLP rules)

**Threat Coverage**:

- T-OCT-05 (Insider exfiltration)

**Validation**:

- ✅ Export with sensitive data patterns is blocked
- ✅ Audit log shows DLP violation

**STRIDE Mapping**:

- **Information Disclosure**: Prevents exfiltration of sensitive data

---

### 9. Security Waiver Process

**Control ID**: CTRL-OCT-09
**Type**: Corrective
**Implementation**: `SECURITY_WAIVERS.md`

**Threat Coverage**:

- T-OCT-03 (Supply chain compromise with no patch available)

**Validation**:

- ✅ Waiver register tracks active, expired, remediated waivers
- ✅ Waivers require justification, mitigation, owner, ≤90 day expiry
- ✅ Security team approval required

**STRIDE Mapping**:

- **Tampering**: Provides risk acceptance process for known vulnerabilities

---

### 10. Audit Trail with Attestation References

**Control ID**: CTRL-OCT-10
**Type**: Detective
**Implementation**: Audit service integration in E2E tests

**Threat Coverage**:

- T-OCT-05 (Insider exfiltration)

**Validation**:

- ✅ Every risky action logged with step-up attestation reference
- ✅ Audit log → provenance trail linkage

**STRIDE Mapping**:

- **Repudiation**: Prevents denial of actions

---

### 11. Fail-Closed Design Pattern

**Control ID**: CTRL-OCT-11
**Type**: Preventive
**Implementation**: All OPA policies and middleware

**Threat Coverage**:

- T-OCT-01 (Malicious release)
- T-OCT-02 (Privilege escalation)
- T-OCT-04 (Policy bypass)

**Validation**:

- ✅ OPA policies default to `deny`
- ✅ Middleware denies on error
- ✅ E2E test validates fail-closed behavior

**STRIDE Mapping**:

- **Tampering**: Ensures security failures result in denial

---

### 12. Policy Input Validation

**Control ID**: CTRL-OCT-12
**Type**: Preventive
**Implementation**: OPA policies validate input structure

**Threat Coverage**:

- T-OCT-04 (Policy bypass via input manipulation)

**Validation**:

- ✅ Policies reject malformed inputs
- ✅ Inputs sourced from trusted contexts

**STRIDE Mapping**:

- **Tampering**: Prevents input manipulation attacks

---

## Attack Surface Changes

### Additions (Increased Attack Surface)

1. **WebAuthn Endpoints** (`/api/webauthn/*`)
   - New attack surface for authentication bypass
   - Mitigation: Standard WebAuthn implementation (@simplewebauthn), security audit recommended

2. **OPA Policy Evaluation Endpoint** (internal)
   - New internal service for policy decisions
   - Mitigation: Network isolation, input validation, fail-closed design

3. **Step-Up Token in Headers** (`X-StepUp-Auth`)
   - New credential type in request headers
   - Mitigation: 5-minute expiry, cryptographic verification, session binding recommended

### Reductions (Decreased Attack Surface)

1. **Unprotected Risky Routes**
   - Previous: All authenticated users could export/delete
   - Now: Step-up authentication required
   - Risk Reduction: High → Low

2. **Unvalidated Releases**
   - Previous: Releases could bypass security checks
   - Now: OPA policy enforcement (fail-closed)
   - Risk Reduction: Critical → Low

3. **Unknown Dependencies**
   - Previous: No SBOM, provenance unknown
   - Now: Complete SBOM + SLSA provenance
   - Risk Reduction: Critical → Medium

---

## Compliance Impact

### SOC 2 Type II

**Affected Controls**:

- **CC6.6 (Logical Access - Least Privilege)**: WebAuthn step-up enforces additional authentication for sensitive operations
- **CC7.2 (System Monitoring)**: SLO alerts + trace exemplars provide continuous monitoring
- **CC8.1 (Change Management)**: OPA release gate enforces policy compliance for all changes

**Evidence**:

- Audit logs with attestation references
- E2E test proof artifacts
- Policy evaluation logs

---

### FedRAMP Moderate

**Affected Controls**:

- **AC-2 (Account Management)**: Step-up authentication for privileged operations
- **AU-2 (Audit Events)**: Comprehensive audit trail with provenance
- **CM-3 (Configuration Change Control)**: Release gate policy enforcement
- **RA-5 (Vulnerability Scanning)**: CodeQL + Trivy + Gitleaks with SARIF
- **SA-10 (Developer Security Testing)**: k6 synthetics + E2E validation

**Evidence**:

- SBOM + provenance for supply chain transparency
- Security scan results (SARIF)
- Release gate policy evaluations

---

### NIST 800-53

**Affected Controls**:

- **AC-6 (Least Privilege)**: Step-up authentication
- **AU-3 (Content of Audit Records)**: Attestation references
- **CM-4 (Security Impact Analysis)**: Threat model delta (this document)
- **RA-5 (Vulnerability Scanning)**: Continuous security scanning
- **SA-11 (Developer Security Testing)**: E2E + synthetics validation

---

## Risk Register Updates

| Risk ID | Description                  | Previous Likelihood | Previous Impact | Previous Score | New Likelihood | New Impact   | New Score | Change |
| ------- | ---------------------------- | ------------------- | --------------- | -------------- | -------------- | ------------ | --------- | ------ |
| RISK-01 | Malicious code in production | Medium (3)          | Critical (5)    | 15             | Low (2)        | Critical (5) | 10        | ↓ 33%  |
| RISK-02 | Privilege escalation         | High (4)            | High (4)        | 16             | Low (2)        | High (4)     | 8         | ↓ 50%  |
| RISK-03 | Supply chain compromise      | Medium (3)          | Critical (5)    | 15             | Medium (3)     | High (4)     | 12        | ↓ 20%  |
| RISK-04 | Insider data exfiltration    | Medium (3)          | High (4)        | 12             | Low (2)        | High (4)     | 8         | ↓ 33%  |
| RISK-05 | Undetected vulnerabilities   | High (4)            | High (4)        | 16             | Low (2)        | High (4)     | 8         | ↓ 50%  |
| RISK-06 | SLO violations undetected    | Medium (3)          | Medium (3)      | 9              | Low (2)        | Medium (3)   | 6         | ↓ 33%  |

**Overall Risk Posture**: Improved by 38% (average risk score reduction)

---

## Security Testing Summary

### Acceptance Criteria Validation

| Control           | Test                              | Result  | Evidence                                                                 |
| ----------------- | --------------------------------- | ------- | ------------------------------------------------------------------------ |
| OPA Release Gate  | PR with missing SBOM blocked      | ✅ Pass | GitHub Actions workflow log                                              |
| OPA Release Gate  | PR with critical vuln blocked     | ✅ Pass | Security scan SARIF results                                              |
| WebAuthn Step-Up  | Export without step-up → 403      | ✅ Pass | E2E test proof artifact `03a_export_blocked.json`                        |
| WebAuthn Step-Up  | Export with step-up → 200 + audit | ✅ Pass | E2E test proof artifacts `03c_export_allowed.json`, `04_audit_logs.json` |
| SBOM + Provenance | SBOM generated (CycloneDX)        | ✅ Pass | GitHub release artifacts                                                 |
| SBOM + Provenance | Provenance with SLSA metadata     | ✅ Pass | `provenance.json` in release                                             |
| Security Scanning | CodeQL SARIF uploaded             | ✅ Pass | GitHub Code Scanning alerts                                              |
| Security Scanning | Trivy SARIF uploaded              | ✅ Pass | GitHub Code Scanning alerts                                              |
| E2E Validation    | Policy outcomes verified          | ✅ Pass | Proof artifacts `06_opa_deny.json`, `06_opa_allow.json`                  |
| SLO Alerts        | Alert fires on violation          | ✅ Pass | `scripts/test-alert-fire.sh` output                                      |
| k6 Synthetics     | Thresholds enforced               | ✅ Pass | GitHub Actions workflow (PR blocking)                                    |
| DLP Policies      | Sensitive data export blocked     | ✅ Pass | Integration test (WebAuthn step-up)                                      |

---

## Recommendations for Future Releases

### High Priority

1. **Implement Signed Policy Inputs**
   - Threat: T-OCT-04 (Policy bypass)
   - Control: GitHub OIDC token verification + Sigstore attestation
   - Timeline: Q1 2026

2. **Add Session Binding to Step-Up Tokens**
   - Threat: T-OCT-02 (Token replay)
   - Control: Bind step-up token to session ID
   - Timeline: Q4 2025

3. **Hermetic Builds with Reproducibility**
   - Threat: T-OCT-03 (Supply chain compromise)
   - Control: Bazel or Nix-based builds, reproducible artifacts
   - Timeline: Q2 2026

### Medium Priority

4. **Behavioral Analytics for Exports**
   - Threat: T-OCT-05 (Insider exfiltration)
   - Control: ML-based anomaly detection for export patterns
   - Timeline: Q2 2026

5. **Binary Attestation at Deployment**
   - Threat: T-OCT-03 (Runtime compromise)
   - Control: Verify SLSA provenance before deployment
   - Timeline: Q1 2026

6. **Policy Fuzzing and Verification**
   - Threat: T-OCT-04 (Policy logic bugs)
   - Control: Automated testing of OPA policies with edge cases
   - Timeline: Q4 2025

### Low Priority

7. **Data Masking for Exports**
   - Threat: T-OCT-05 (Data leakage)
   - Control: Automatic PII redaction in exports
   - Timeline: Q3 2026

8. **Rate Limiting for Risky Operations**
   - Threat: T-OCT-05 (Bulk exfiltration)
   - Control: Per-user/role rate limits on exports
   - Timeline: Q3 2026

---

## Appendices

### Appendix A: STRIDE Analysis

| Threat Category            | Controls Implemented                                    | Residual Risk |
| -------------------------- | ------------------------------------------------------- | ------------- |
| **Spoofing**               | WebAuthn step-up, session binding (recommended)         | Low           |
| **Tampering**              | OPA release gate, SBOM + provenance, fail-closed design | Low           |
| **Repudiation**            | Audit trail with attestation, provenance                | Low           |
| **Information Disclosure** | DLP policies, Gitleaks secret scanning                  | Low           |
| **Denial of Service**      | SLO alerts, k6 synthetics, trace exemplars              | Low           |
| **Elevation of Privilege** | WebAuthn step-up, OPA policy enforcement                | Low           |

---

### Appendix B: Control Effectiveness Metrics

**Track in Grafana dashboard**: "Security Control Effectiveness"

```promql
# Release gate block rate
rate(release_gate_deny_total[1h]) / rate(release_gate_total[1h])

# Step-up authentication success rate
rate(stepup_auth_success_total[1h]) / rate(stepup_auth_attempts_total[1h])

# Critical vulnerabilities detected per week
increase(critical_vulnerabilities_detected_total[1w])

# Security waiver approval time
histogram_quantile(0.95, rate(security_waiver_approval_duration_seconds_bucket[1w]))
```

---

### Appendix C: Incident Response Procedures

**If security control fails**:

1. **Isolate**: Disable affected control, rollback to previous version
2. **Investigate**: Review audit logs, policy inputs, workflow runs
3. **Contain**: Block malicious activity, revoke credentials if needed
4. **Remediate**: Fix control logic, update policy, redeploy
5. **Validate**: Run E2E tests, verify acceptance criteria
6. **Document**: Update threat model, post-mortem analysis

**Escalation Path**:

- Security control failure → Security Team (Slack: #security)
- Active exploitation → CISO + On-Call SRE (PagerDuty)
- Data breach → CISO + Legal + PR (Executive incident response)

---

## Contacts

- **Security Engineering**: security@example.com, Slack: #security
- **Threat Modeling**: threat-modeling@example.com, Slack: #threat-modeling
- **CISO**: ciso@example.com
- **Compliance**: compliance@example.com, Slack: #compliance

---

## Related Documentation

- [CI Release Gate Runbook](runbooks/CI_RELEASE_GATE_RUNBOOK.md)
- [Synthetics & Dashboards Runbook](runbooks/SYNTHETICS_DASHBOARDS_RUNBOOK.md)
- [WebAuthn Step-Up README](WEBAUTHN_STEPUP_README.md)
- [E2E Golden Path README](E2E_GOLDEN_PATH_README.md)
- [Security Waivers](/SECURITY_WAIVERS.md)
- [SBOM Workflow](/.github/workflows/build-sbom-provenance.yml)
- [Security Scans Workflow](/.github/workflows/security-scans-sarif.yml)

---

**Last Updated**: October 4, 2025
**Version**: 1.0
**Issue**: #10074
**Reviewed By**: Security Engineering Team
**Approved By**: CISO (pending)
