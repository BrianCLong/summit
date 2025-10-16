# Post-Deploy Validation (PDV) Checklist

## IntelGraph Platform v0.4.0 "Observability → Action"

**Release**: v0.4.0-week4-observability-action
**Deploy Date**: September 24, 2025 (Planned)
**Validation Window**: 24 hours post-production deployment
**Validator**: SRE On-Call Team
**Escalation**: Maestro Conductor + Platform Engineering Lead

---

## 🎯 **PDV Objectives**

1. **Verify SLO compliance** across all services and environments
2. **Validate observability-to-action pipelines** are functioning correctly
3. **Confirm cost guardrails** are protecting against budget overruns
4. **Test rollback mechanisms** are ready for emergency use
5. **Ensure security posture** remains strong post-deployment

---

## ⏰ **Timeline & Checkpoints**

| Checkpoint      | Time Post-Deploy | Validator           | Critical Actions                    |
| --------------- | ---------------- | ------------------- | ----------------------------------- |
| **Immediate**   | T+15 minutes     | SRE On-Call         | Basic health checks, SLO validation |
| **Short-term**  | T+2 hours        | Platform Lead       | Comprehensive system validation     |
| **Medium-term** | T+8 hours        | Business Hours Team | Feature validation, cost analysis   |
| **Final**       | T+24 hours       | Release Manager     | Complete PDV sign-off               |

---

## 🔍 **Validation Categories**

### **Category 1: Core System Health**

#### ✅ **1.1 Service Availability**

- [ ] **IntelGraph Server**: >99.5% availability in last 2 hours
  - Check: `curl -f https://api.intelgraph.com/health`
  - Threshold: Response time <50ms, Success rate >99.5%
  - Dashboard: [Service Health Dashboard](https://grafana.intelgraph.com/d/service-health)

- [ ] **AI Insights Service**: >95% availability (MVP-0 tolerance)
  - Check: `curl -f https://ai.intelgraph.com/health`
  - Threshold: Response time <200ms, Success rate >95%
  - Feature Flags: Verify gradual rollout percentage

- [ ] **Database Connectivity**: All connections healthy
  - PostgreSQL: Connection pool utilization <80%
  - Neo4j: Query response time P95 <300ms
  - Redis: Cache hit rate >80%

#### ✅ **1.2 SLO Compliance Validation**

- [ ] **API/GraphQL SLOs**: Meet all defined thresholds
  - P95 latency ≤350ms (reads), ≤700ms (writes)
  - P99 latency ≤800ms (reads), ≤1.2s (writes)
  - Error rate <1% for critical endpoints
  - Availability >99.9% for production services

- [ ] **Graph Operations SLOs**: Neo4j performance within limits
  - 1-hop traversal P95 ≤300ms
  - 2-3 hop traversal P95 ≤1200ms
  - Complex analytics queries P95 ≤2000ms

- [ ] **Ingest Pipeline SLOs**: Data processing performance
  - Stream processing time P95 ≤100ms
  - Batch throughput ≥50MB/s/worker
  - Queue depth <1000 messages during normal load

### **Category 2: Observability → Action Framework**

#### ✅ **2.1 Error Budgets & Burn-Rate Alerts**

- [ ] **Multi-window burn-rate detection**: Alerts firing correctly
  - Test: Simulate 5-minute burn rate spike
  - Verify: Critical alert triggered within 15 seconds
  - Validate: Alert routing to correct channels (#sre-alerts)

- [ ] **Error budget consumption**: Within acceptable limits
  - Current error budget remaining >70%
  - Burn rate projections show <80% monthly consumption
  - Historical trend analysis shows stable pattern

- [ ] **Alert deduplication**: No alert fatigue
  - Verify multi-window alerts don't spam
  - Confirm inhibition rules work correctly
  - Test alert silencing during maintenance

#### ✅ **2.2 Auto-Rollback Mechanism**

- [ ] **Canary rollback capability**: Test in staging
  - Deploy known problematic version to staging
  - Verify auto-rollback triggers within 90 seconds
  - Confirm traffic restoration to stable version
  - Validate cooldown period prevents flapping

- [ ] **SLO breach detection**: Monitoring system responsiveness
  - Test consecutive failure detection (N=3)
  - Verify rollback decision logic
  - Confirm audit logging captures timeline

- [ ] **Rollback communications**: Notifications working
  - Slack notifications to #sre-alerts
  - PagerDuty escalation if configured
  - GitHub issue creation for post-incident

#### ✅ **2.3 Performance Budget Enforcement**

- [ ] **PR blocking mechanism**: CI/CD integration working
  - Create test PR with performance regression
  - Verify budget checker fails CI build
  - Confirm detailed diagnostics generated
  - Test budget override mechanism if needed

- [ ] **Critical path protection**: Health/auth endpoints protected
  - Verify stricter budgets for /health, /graphql
  - Test that critical path violations block PRs
  - Confirm non-critical violations allow with warnings

### **Category 3: AI Insights & Explainability**

#### ✅ **3.1 AI Insights Service Integration**

- [ ] **FastAPI service health**: MVP-0 service operational
  - Health endpoint responding <200ms
  - Model loading successful at startup
  - OpenTelemetry tracing functional

- [ ] **Entity resolution functionality**: Core AI features working
  - Test entity deduplication endpoint
  - Verify confidence scores in response
  - Validate feature flag gating works

- [ ] **XAI audit trail**: Explainability artifacts generated
  - Verify audit middleware captures requests
  - Check artifact storage in /var/run/ai-artifacts
  - Test explanation endpoint generation
  - Validate model card snapshots

#### ✅ **3.2 GraphQL Integration**

- [ ] **AI schema extensions**: New fields available
  - Query Entity.aiScore field
  - Test AI insights mutations
  - Verify error handling for disabled features

- [ ] **Client integration**: Node.js client working
  - AI insights client connection successful
  - Tracing integration functional
  - Fallback handling for service unavailability

### **Category 4: Chaos Engineering & Resilience**

#### ✅ **4.1 Chaos Infrastructure**

- [ ] **Litmus controller**: Chaos platform operational
  - Litmus controller pods running
  - ChaosEngine CRDs accessible
  - RBAC permissions correctly scoped

- [ ] **Safety guardrails**: Protection mechanisms active
  - Namespace scoping to staging only
  - Pod impact limited to ≤25%
  - Health probes monitoring during experiments
  - Time boundaries enforced (≤10 minutes)

#### ✅ **4.2 Chaos Experiment Execution** _(Staging Only)_

- [ ] **Pod killer experiment**: Resilience testing
  - Execute controlled pod deletion
  - Verify system recovery within 45 seconds
  - Confirm SLO impact remains within bounds
  - Validate monitoring alerts and dashboards

- [ ] **Network latency experiment**: Network resilience
  - Inject 100ms latency with 10ms jitter
  - Monitor service response time impact
  - Verify graceful degradation patterns
  - Confirm automatic experiment cleanup

### **Category 5: FinOps & Cost Management**

#### ✅ **5.1 Cost Monitoring & Alerts**

- [ ] **Budget compliance**: All environments within limits
  - Development: <$1000/month (current utilization)
  - Staging: <$3000/month (current utilization)
  - Production: <$18000/month (current utilization)
  - Total org budget tracking functional

- [ ] **Unit cost validation**: Efficiency metrics within targets
  - Ingested events: ≤$0.10/1K events
  - GraphQL calls: ≤$2/1M calls
  - Alert when >10% day-over-day increase

- [ ] **Emergency enforcement**: Auto-scaling protection
  - Test budget threshold breach simulation
  - Verify auto-scaling down non-prod environments
  - Confirm critical services excluded from scaling
  - Validate alert escalation to FinOps team

#### ✅ **5.2 Cost Optimization**

- [ ] **Savings realization**: Projected benefits achieved
  - Validate $4K-5.5K annual savings projection
  - Confirm automated cleanup processes active
  - Verify resource optimization recommendations
  - Test cost anomaly detection accuracy

### **Category 6: Security & Compliance**

#### ✅ **6.1 Security Posture**

- [ ] **Vulnerability status**: No new critical vulnerabilities
  - Run post-deploy security scan
  - Verify 0 critical, acceptable high/medium count
  - Confirm container image signatures valid
  - Check secret scanning results clean

- [ ] **Access controls**: RBAC and permissions correct
  - Chaos experiments require step-up auth
  - Service accounts have minimal required permissions
  - API authentication working correctly
  - Audit logging capturing all admin actions

#### ✅ **6.2 Compliance Validation**

- [ ] **Data retention**: Policies correctly applied
  - PII data: 30-day retention configured
  - Audit logs: 7-year retention confirmed
  - Evidence artifacts: Proper classification
  - Encryption: Field-level PII protection active

- [ ] **Audit trail**: Complete change tracking
  - All deployment changes logged
  - Provenance bundle integrity verified
  - Digital signatures valid
  - Change approval workflow documented

### **Category 7: Evidence & Provenance**

#### ✅ **7.1 Bundle Verification**

- [ ] **Provenance bundle integrity**: External verification
  - Run: `python tools/verify-bundle.py --manifest provenance/export-manifest.json`
  - Verify all file hashes match manifest
  - Confirm digital signatures valid
  - Test bundle with external verifier

- [ ] **Evidence completeness**: All artifacts present
  - 18 evidence files in evidence/ directory
  - Test validation reports accessible
  - Performance analysis artifacts available
  - Security scan results included

#### ✅ **7.2 Monitoring & Dashboards**

- [ ] **Grafana dashboards**: All dashboards operational
  - SLO monitoring dashboard functional
  - Chaos engineering impact dashboard
  - FinOps cost control dashboard
  - AI insights performance dashboard
  - Error budget burn rate visualization

- [ ] **Alert manager**: Notification routing working
  - Test alert delivery to Slack channels
  - Verify PagerDuty integration if configured
  - Confirm alert acknowledgment workflow
  - Test alert silencing during maintenance

---

## 🚨 **Escalation Procedures**

### **Immediate Escalation Triggers**

- Any critical service availability <99%
- Error budget consumption >50% in first 8 hours
- Security vulnerability discovered (any severity)
- Auto-rollback mechanism fails to function
- Cost budget breach >95% in any environment

### **Escalation Contacts**

1. **Level 1**: SRE On-Call → Platform Engineering Lead
2. **Level 2**: Platform Engineering Lead → Maestro Conductor
3. **Level 3**: Maestro Conductor → Executive Stakeholders

### **Emergency Rollback Procedure**

```bash
# Immediate rollback command
helm rollback intelgraph <previous-version> --namespace production

# Disable new features via feature flags
kubectl patch configmap feature-flags --patch '{"data":{"ENABLE_AI_INSIGHTS":"false","ENABLE_AUTO_ROLLBACK":"false"}}'

# Scale down problematic services
kubectl scale deployment ai-insights --replicas=0 --namespace production
```

---

## 📊 **Success Criteria**

### **Must-Pass Criteria** (Deployment FAILS if not met)

- [ ] All critical services >99.5% availability
- [ ] No critical security vulnerabilities
- [ ] Auto-rollback mechanism functional
- [ ] Error budget consumption <30% in 24 hours
- [ ] Cost budgets within organizational limits

### **Should-Pass Criteria** (Acceptable risks, monitor closely)

- [ ] AI Insights service >95% availability
- [ ] Performance budgets functional but may have edge cases
- [ ] Chaos experiments execute successfully in staging
- [ ] FinOps alerts routing correctly but may need tuning

### **Nice-to-Have Criteria** (Future improvements acceptable)

- [ ] Perfect alert deduplication (some noise acceptable)
- [ ] 100% test coverage (current 61% acceptable for MVP)
- [ ] All chaos experiment scenarios pass (6/7 current status)

---

## 📋 **Sign-off Record**

### **PDV Completion Sign-off**

- [ ] **T+15min Validation**: ****\_**** (SRE On-Call) Date: **\_\_\_**
- [ ] **T+2hr Validation**: ****\_**** (Platform Lead) Date: **\_\_\_**
- [ ] **T+8hr Validation**: ****\_**** (Business Hours Team) Date: **\_\_\_**
- [ ] **T+24hr Final PDV**: ****\_**** (Release Manager) Date: **\_\_\_**

### **Final Release Approval**

- [ ] **PDV Complete**: All critical criteria met
- [ ] **Evidence Updated**: Post-deploy evidence added to bundle
- [ ] **Stakeholder Notification**: Release notes sent to stakeholders
- [ ] **Documentation Updated**: Runbooks reflect production reality

**Final Approval**: ****\_**** (Maestro Conductor) Date: **\_\_\_**

---

## 📈 **Post-PDV Actions**

### **Success Path**

1. Update provenance bundle with PDV results
2. Send success notification to stakeholders
3. Schedule Week-5 hardening planning session
4. Document lessons learned and improvements

### **Partial Success Path**

1. Document issues and mitigation steps taken
2. Create follow-up action items for Week-5
3. Update risk register with new findings
4. Continue monitoring with increased vigilance

### **Failure Path**

1. Execute emergency rollback procedures
2. Convene incident response team
3. Document root cause analysis
4. Plan remediation and re-deployment strategy

---

**Document Version**: 1.0
**Last Updated**: September 22, 2025
**Next Review**: Post-PDV completion + 48 hours
