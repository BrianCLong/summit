# Features → SOW Acceptance Mapping

**Purpose**: Maps October 2025 features to SOW acceptance criteria and validation methods

**Pilot Program**: IntelGraph October 2025
**Version**: 2025.10.HALLOWEEN
**Last Updated**: October 4, 2025

---

## Mapping Table

| Feature ID | Feature Name                                  | SOW Section | Acceptance Criteria                                            | Validation Method                                                                            | Success Metric                                                                     | Owner            |
| ---------- | --------------------------------------------- | ----------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------- |
| **F-001**  | **OPA Release Gate**                          | 4.2         | Release gate blocks PRs with missing SBOM                      | Test PR without SBOM → expect block                                                          | Policy denial logged                                                               | SRE              |
| F-001.1    | Release gate fail-closed enforcement          | 4.2         | Release gate blocks PRs with critical vulnerabilities          | Test PR with critical vuln → expect block                                                    | SARIF shows critical vuln + policy denial                                          | Security         |
| F-001.2    | Policy violation visibility                   | 4.2         | Policy decisions visible in dashboards                         | View OPA decision metrics in Grafana                                                         | Dashboard shows allow/deny counts                                                  | Observability    |
| F-001.3    | False positive rate                           | 4.2         | <2% false positive rate for policy violations                  | Track policy denials, validate legitimacy                                                    | (false positives / total denials) < 0.02                                           | QA               |
| **F-002**  | **WebAuthn Step-Up Authentication**           | 4.1         | ≥90% of pilot users successfully register WebAuthn credentials | User onboarding logs + WebAuthn registration events                                          | (registered users / total users) ≥ 0.90                                            | Customer Success |
| F-002.1    | Step-up for exports                           | 4.1         | ≥80% of export operations include step-up authentication       | Audit logs with step-up attestation references                                               | (exports with step-up / total exports) ≥ 0.80                                      | SRE              |
| F-002.2    | Step-up UX satisfaction                       | 4.1         | User satisfaction rating ≥4/5 for step-up UX                   | Weekly feedback survey question: "Rate step-up auth ease of use (1-5)"                       | Avg rating ≥ 4.0                                                                   | Product          |
| F-002.3    | False positive rate                           | 4.1         | <5% false positive rate (legitimate operations blocked)        | Track step-up denials, validate legitimacy                                                   | (false positives / total denials) < 0.05                                           | QA               |
| **F-003**  | **SBOM + SLSA Provenance**                    | 4.2         | SBOM generated for all releases                                | Download SBOM from GitHub release                                                            | sbom.json present with 180+ components                                             | Security         |
| F-003.1    | Provenance attestation                        | 4.2         | SLSA provenance with builder metadata                          | Download provenance.json from release                                                        | Provenance includes builder ID, commit, timestamp                                  | Security         |
| F-003.2    | Artifact integrity                            | 4.2         | SHA256 checksums match for all artifacts                       | Verify checksums: `sha256sum -c checksums.txt`                                               | All checksums: OK                                                                  | SRE              |
| **F-004**  | **Grafana SLO Dashboards**                    | 4.3         | All 5 SLO panels populated with live data                      | View Grafana dashboard                                                                       | API latency, OPA latency, queue lag, ingest failures, golden flow all showing data | Observability    |
| F-004.1    | Panel UIDs documented                         | 4.3         | Panel UIDs listed in release notes                             | Check RELEASE_NOTES_2025.10.HALLOWEEN.md                                                     | Table with 5 panel UIDs present                                                    | Documentation    |
| F-004.2    | Trace exemplars                               | 4.3         | Trace exemplars clickable and linked to traces in Tempo        | Click OPA latency data point → Tempo opens                                                   | Trace opens with span details                                                      | Observability    |
| F-004.3    | Dashboard usability                           | 4.3         | User satisfaction rating ≥4/5 for dashboard usability          | Weekly feedback survey question: "Rate dashboard usability (1-5)"                            | Avg rating ≥ 4.0                                                                   | Product          |
| **F-005**  | **k6 Synthetics Suite**                       | 4.4         | Golden flow tests pass with SLO compliance                     | View k6 test results in GitHub Actions                                                       | All thresholds met (API p95 <1.5s, success >99%)                                   | QA               |
| F-005.1    | Synthetics on PR                              | 4.4         | k6 tests run on every PR (blocking if breached)                | Create test PR → k6 workflow runs                                                            | Workflow blocks PR if thresholds fail                                              | SRE              |
| F-005.2    | Nightly synthetics                            | 4.4         | Nightly synthetics run with Slack alerts                       | Check Slack #alerts channel at 2 AM UTC                                                      | Alert sent if thresholds breached                                                  | SRE              |
| **F-006**  | **Security Scanning (CodeQL/Trivy/Gitleaks)** | 4.2         | CodeQL SARIF uploaded to GitHub Code Scanning                  | View GitHub Security tab                                                                     | CodeQL results visible                                                             | Security         |
| F-006.1    | Trivy SARIF                                   | 4.2         | Trivy SARIF uploaded to GitHub Code Scanning                   | View GitHub Security tab                                                                     | Trivy results visible                                                              | Security         |
| F-006.2    | Critical vuln enforcement                     | 4.2         | Critical vulnerabilities block release (unless waived)         | Test release with critical vuln                                                              | Release blocked OR waiver present                                                  | Security         |
| **F-007**  | **Golden Path E2E Validation**                | 4.4         | E2E test validates complete workflow                           | Run `make e2e:golden`                                                                        | All 8 proof artifacts generated                                                    | QA               |
| F-007.1    | Export blocked without step-up                | 4.1         | E2E test: export without step-up → 403                         | Check `03a_export_blocked.json`                                                              | HTTP 403 with "step-up required" message                                           | QA               |
| F-007.2    | Export allowed with step-up                   | 4.1         | E2E test: export with step-up → 200 + audit                    | Check `03c_export_allowed.json` + `04_audit_logs.json`                                       | HTTP 200 + audit entry with attestation                                            | QA               |
| F-007.3    | Policy outcomes verified                      | 4.2         | E2E test: OPA policy outcomes (block/allow)                    | Check `06_opa_deny.json` + `06_opa_allow.json`                                               | Deny without step-up, allow with step-up                                           | QA               |
| **F-008**  | **SLO Alerts + Trace Exemplars**              | 4.3         | Alerts fire and route to Slack/PagerDuty                       | Run `./scripts/test-alert-fire.sh`                                                           | Alert visible in Alertmanager + Slack notification sent                            | Observability    |
| F-008.1    | OPA latency alert with exemplar               | 4.3         | OPA latency alert includes exemplar query                      | Check alert annotation in Alertmanager                                                       | `exemplar_query` field present in alert                                            | Observability    |
| F-008.2    | Critical alerts to PagerDuty                  | 4.3         | Critical alerts route to PagerDuty + Slack                     | Trigger critical alert (queue lag >10k)                                                      | PagerDuty incident created + Slack notification                                    | SRE              |
| **F-009**  | **Performance SLOs**                          | 4.4         | API p95 latency <1.5s                                          | Query Prometheus: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` | Value < 1.5                                                                        | SRE              |
| F-009.1    | OPA p95 latency                               | 4.4         | OPA p95 latency <500ms                                         | Query Prometheus: `histogram_quantile(0.95, rate(opa_decision_duration_seconds_bucket[5m]))` | Value < 0.5                                                                        | SRE              |
| F-009.2    | Golden flow success                           | 4.4         | Golden flow success rate >99%                                  | Query Prometheus: `rate(golden_flow_success_total[5m]) / rate(golden_flow_total[5m])`        | Value > 0.99                                                                       | QA               |
| **F-010**  | **Uptime & Availability**                     | 4.4         | Uptime ≥99.5% over 30-day pilot                                | Track uptime via Prometheus                                                                  | (uptime / total time) ≥ 0.995                                                      | SRE              |
| F-010.1    | Zero critical security incidents              | 4.4         | No critical security incidents during pilot                    | Review security incident log                                                                 | 0 critical incidents                                                               | Security         |
| **F-011**  | **Support & Response**                        | 4.5         | <5% of support requests escalated to L3                        | Track support tickets by level                                                               | (L3 tickets / total tickets) < 0.05                                                | Customer Success |
| F-011.1    | Response time SLA                             | 4.5         | Average response time <2 hours for high-priority issues        | Track ticket response times                                                                  | Avg response time < 2 hours                                                        | Customer Success |
| **F-012**  | **Overall Satisfaction**                      | 4.5         | Overall pilot satisfaction rating ≥4/5                         | Final pilot survey question: "Overall satisfaction (1-5)"                                    | Avg rating ≥ 4.0                                                                   | Product          |

---

## Feature Groups

### Security Features (F-001 to F-003, F-006, F-010.1)

**SOW Sections**: 4.1 (WebAuthn), 4.2 (OPA + Scanning)
**Total Features**: 11
**Acceptance Criteria**: 11
**Owner**: Security + SRE

**Summary**:

- OPA release gate with fail-closed enforcement
- WebAuthn step-up for risky operations
- SBOM + SLSA provenance
- Security scanning (CodeQL/Trivy/Gitleaks)
- Zero critical incidents

---

### Observability Features (F-004, F-008)

**SOW Sections**: 4.3 (Dashboards + Alerts)
**Total Features**: 6
**Acceptance Criteria**: 6
**Owner**: Observability + SRE

**Summary**:

- Grafana SLO dashboards with 5 panels
- Trace exemplars linked to Tempo
- Prometheus alerts with Alertmanager routing
- Slack/PagerDuty notifications

---

### Testing & Validation Features (F-005, F-007, F-009)

**SOW Sections**: 4.4 (Performance + Availability)
**Total Features**: 8
**Acceptance Criteria**: 8
**Owner**: QA + SRE

**Summary**:

- k6 synthetics suite (PR + nightly)
- E2E golden path validation with proof artifacts
- Performance SLOs (API, OPA, golden flow)

---

### Support & Satisfaction Features (F-011, F-012)

**SOW Sections**: 4.5 (Support + Satisfaction)
**Total Features**: 3
**Acceptance Criteria**: 3
**Owner**: Customer Success + Product

**Summary**:

- Support escalation <5% to L3
- Response time <2 hours for high-priority
- Overall satisfaction ≥4/5

---

## Validation Schedule

| Week       | Features Validated                                                    | Validation Activities                                                  | Deliverables                                                           |
| ---------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Week 1** | F-002 (WebAuthn), F-010 (Uptime)                                      | User onboarding, WebAuthn registration, uptime monitoring              | User registration logs, uptime dashboard                               |
| **Week 2** | F-001 (OPA), F-004 (Dashboards), F-009 (Performance)                  | Policy testing, dashboard review, SLO monitoring                       | Policy test results, dashboard screenshots, SLO metrics                |
| **Week 3** | F-005 (Synthetics), F-007 (E2E), F-008 (Alerts)                       | k6 tests, E2E validation, alert testing                                | k6 reports, E2E proof artifacts, alert logs                            |
| **Week 4** | F-003 (SBOM), F-006 (Security), F-011 (Support), F-012 (Satisfaction) | SBOM verification, security scan review, support metrics, final survey | SBOM/provenance files, security reports, support stats, survey results |

---

## Pass/Fail Criteria

### Pass Criteria

**All of the following must be true**:

- ✅ ≥90% of features meet acceptance criteria (≥24 out of 28 features)
- ✅ All P0 features (F-001, F-002, F-010) meet acceptance criteria
- ✅ Overall pilot satisfaction ≥4/5 (F-012)
- ✅ Zero critical security incidents (F-010.1)
- ✅ Uptime ≥99.5% (F-010)

**If pass**: Pilot is successful → Customer proceeds to GA adoption decision

---

### Fail Criteria

**Any of the following causes pilot failure**:

- ❌ <80% of features meet acceptance criteria (<22 out of 28 features)
- ❌ Any P0 feature (F-001, F-002, F-010) fails acceptance criteria
- ❌ Overall pilot satisfaction <3.5/5
- ❌ Critical security incident occurs
- ❌ Uptime <95%

**If fail**: Pilot is unsuccessful → Provider addresses issues, offers extension or future pilot

---

## Traceability Matrix

| SOW Section        | Features                     | Acceptance Criteria                                                                    | Validation Methods                                                | Evidence Documents                                                                         |
| ------------------ | ---------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 4.1 WebAuthn       | F-002, F-007.1, F-007.2      | ≥90% registration, ≥80% step-up usage, ≥4/5 satisfaction                               | User logs, audit logs, E2E tests, surveys                         | `04_audit_logs.json`, `03a_export_blocked.json`, `03c_export_allowed.json`, feedback forms |
| 4.2 OPA + Security | F-001, F-003, F-006, F-007.3 | Policy blocks violations, SBOM/provenance present, SARIF uploaded, <2% false positives | Test PRs, release artifacts, GitHub Security tab, E2E tests       | `sbom.json`, `provenance.json`, SARIF files, `06_opa_deny.json`, `06_opa_allow.json`       |
| 4.3 Observability  | F-004, F-008                 | 5 panels live, trace exemplars clickable, alerts route, ≥4/5 satisfaction              | Dashboard screenshots, alert test script, surveys                 | Grafana dashboard JSON, Alertmanager logs, `scripts/test-alert-fire.sh` output             |
| 4.4 Performance    | F-005, F-007, F-009, F-010   | k6 passes, E2E proof artifacts, SLOs met, ≥99.5% uptime                                | k6 reports, E2E test output, Prometheus queries, uptime dashboard | k6 HTML report, `e2e-proof/` directory, Prometheus metrics, uptime graph                   |
| 4.5 Support        | F-011, F-012                 | <5% L3 escalation, <2hr response, ≥4/5 satisfaction                                    | Support ticket stats, response time logs, final survey            | Support dashboard, ticket metrics, survey results                                          |

---

## Evidence Package

At pilot end, Provider will deliver evidence package containing:

**Security Evidence**:

- [ ] SBOM files (sbom.json, sbom.xml)
- [ ] Provenance attestation (provenance.json)
- [ ] Security scan reports (SARIF files)
- [ ] WebAuthn registration logs
- [ ] Audit logs with attestation references

**Observability Evidence**:

- [ ] Grafana dashboard export (JSON)
- [ ] Screenshots of all 5 SLO panels
- [ ] Trace exemplar demonstration (screenshot/video)
- [ ] Alert test output (`scripts/test-alert-fire.sh`)
- [ ] Prometheus metrics export (30-day history)

**Testing Evidence**:

- [ ] k6 test reports (HTML + JSON)
- [ ] E2E proof artifacts (8 files)
- [ ] Performance SLO compliance report

**Support Evidence**:

- [ ] Support ticket summary
- [ ] Response time metrics
- [ ] Escalation statistics

**Satisfaction Evidence**:

- [ ] Weekly feedback forms (4 weeks)
- [ ] Final pilot survey results
- [ ] User testimonials (if available)

---

## Contacts

**For Feature Validation Questions**:

- Security Features: security@intelgraph.example.com
- Observability Features: observability@intelgraph.example.com
- Testing Features: qa@intelgraph.example.com
- Support Features: customer-success@intelgraph.example.com

**For SOW Questions**:

- BizDev: bizdev@intelgraph.example.com
- Program Manager: Brian Long (brian@intelgraph.example.com)

---

## Related Documents

- [Pilot SOW Template](PILOT_SOW_TEMPLATE.md)
- [Value Metrics Tracking](VALUE_METRICS.md)
- [Pilot Deployment Guide](../docs/PILOT_DEPLOYMENT_GUIDE.md)
- [Release Notes](../docs/RELEASE_NOTES_2025.10.HALLOWEEN.md)
- [Threat Model Delta](../docs/THREAT_MODEL_DELTA_OCT2025.md)

---

**Document Version**: 1.0
**Last Updated**: October 4, 2025
**Issue**: #10071
