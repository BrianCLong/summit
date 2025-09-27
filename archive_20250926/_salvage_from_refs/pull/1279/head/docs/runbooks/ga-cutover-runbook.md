# IntelGraph GA Cutover Runbook
**Sprint 26: Enterprise-Grade General Availability Deployment**

## Overview

This runbook provides step-by-step procedures for executing the IntelGraph GA cutover, including rollback procedures, incident response, and post-cutover validation.

**Target Date:** September 17, 2025
**Duration:** 2-hour change window
**Team:** SRE, Security, Engineering, Product

## Pre-Cutover Checklist (T-24h to T-1h)

### T-24h: Final Preparation

- [ ] **Change Freeze Activated**
  ```bash
  igctl freeze start --reason "GA Cutover Sprint 26" --duration 48h --approvers alice,bob
  ```

- [ ] **Final Code Freeze Verification**
  - [ ] All Sprint 26 features merged to `main`
  - [ ] Release candidate `v1.0.0-rc3` tagged
  - [ ] Provenance verification passed
  ```bash
  verify-bundle verify --image ghcr.io/intelgraph/api:v1.0.0-rc3 --slsa-level 3
  ```

- [ ] **Infrastructure Readiness**
  - [ ] Neo4j read replicas warmed up
  - [ ] Redis cache pre-loaded with top persisted queries
  - [ ] CDN cache purged and refreshed
  - [ ] Load balancer health checks configured

- [ ] **Security Validation**
  - [ ] WebAuthn step-up policies enabled (audit mode)
  - [ ] OPA policy bundles updated and tested
  - [ ] SLSA3 provenance verification enforced
  - [ ] Emergency bypass procedures documented

### T-12h: System Validation

- [ ] **Load Testing Execution**
  ```bash
  cd tools/k6
  ./run-ga-validation.sh staging full
  ```
  - [ ] All SLO gates passed
  - [ ] Error budget within limits
  - [ ] No rollback triggers activated

- [ ] **Backup Verification**
  ```bash
  igctl drill run backup-restore --target postgres --assert rpo<=5m
  igctl drill run backup-restore --target neo4j --assert rpo<=5m
  ```

- [ ] **DR Drill Execution**
  ```bash
  igctl drill run failover --target neo4j-replica-1 --assert rto<=10m
  ```

### T-6h: Final Checks

- [ ] **Monitoring Setup**
  - [ ] GA cutover dashboards deployed
  - [ ] SLO alerts configured and tested
  - [ ] On-call team notified and ready
  - [ ] War room bridge established

- [ ] **Cost Guardrails Verification**
  ```bash
  igctl status budget
  # Verify all categories under 80% utilization
  ```

- [ ] **Team Readiness**
  - [ ] Primary on-call engineer identified
  - [ ] Secondary on-call engineer identified
  - [ ] Escalation procedures reviewed
  - [ ] Communication channels tested

### T-1h: Go/No-Go Decision

- [ ] **Final System Health Check**
  ```bash
  igctl status health
  igctl status slo
  igctl status security
  ```

- [ ] **Go/No-Go Meeting**
  - [ ] SRE Lead: System health ✅/❌
  - [ ] Security Lead: Security posture ✅/❌
  - [ ] Engineering Lead: Code readiness ✅/❌
  - [ ] Product Lead: Business readiness ✅/❌
  - [ ] **Final Decision:** GO / NO-GO

## Cutover Execution (T-0 to T+2h)

### Phase 1: Canary Deployment (T+0 to T+30m)

1. **Deploy 1% Canary**
   ```bash
   # Deploy canary with feature flags
   kubectl set image deployment/intelgraph-gateway api=ghcr.io/intelgraph/api:v1.0.0 -n intelgraph
   kubectl patch deployment intelgraph-gateway -p '{"spec":{"template":{"metadata":{"annotations":{"canary.percentage":"1"}}}}}' -n intelgraph
   ```

2. **Monitor Canary Health (5 minutes)**
   - Watch GA cutover dashboard
   - Verify SLO compliance:
     - GraphQL read p95 ≤ 350ms ✅/❌
     - GraphQL write p95 ≤ 700ms ✅/❌
     - Error rate ≤ 0.1% ✅/❌

3. **Expand to 5% Traffic**
   ```bash
   kubectl patch deployment intelgraph-gateway -p '{"spec":{"template":{"metadata":{"annotations":{"canary.percentage":"5"}}}}}' -n intelgraph
   ```

4. **Monitor 5% Canary (10 minutes)**
   - Check for SLO violations
   - Verify cache hit rates ≥ 85%
   - Monitor ER pipeline health

5. **Expand to 25% Traffic**
   ```bash
   kubectl patch deployment intelgraph-gateway -p '{"spec":{"template":{"metadata":{"annotations":{"canary.percentage":"25"}}}}}' -n intelgraph
   ```

### Phase 2: Security Enforcement (T+30m to T+60m)

1. **Enable WebAuthn Step-up Enforcement**
   ```bash
   kubectl patch configmap security-config -p '{"data":{"webauthn_enforce":"true"}}' -n intelgraph
   ```

2. **Activate OPA Policy Enforcement**
   ```bash
   kubectl patch configmap opa-config -p '{"data":{"default_decision":"deny"}}' -n intelgraph
   ```

3. **Enable Persisted Query Allowlist**
   ```bash
   kubectl patch configmap graphql-config -p '{"data":{"pq_enforce":"true"}}' -n intelgraph
   ```

4. **Monitor Security Metrics (15 minutes)**
   - WebAuthn step-up rate ≤ 0.5% ✅/❌
   - Policy decision latency p95 ≤ 25ms ✅/❌
   - No security alerts triggered ✅/❌

### Phase 3: Full Deployment (T+60m to T+90m)

1. **Deploy to 50% Traffic**
   ```bash
   kubectl patch deployment intelgraph-gateway -p '{"spec":{"template":{"metadata":{"annotations":{"canary.percentage":"50"}}}}}' -n intelgraph
   ```

2. **Monitor Performance (10 minutes)**
   - All SLOs within bounds
   - Cost budget compliance
   - No degradation in user experience

3. **Deploy to 100% Traffic**
   ```bash
   kubectl patch deployment intelgraph-gateway -p '{"spec":{"template":{"metadata":{"annotations":{"canary.percentage":"100"}}}}}' -n intelgraph
   ```

### Phase 4: Validation (T+90m to T+120m)

1. **End-to-End Validation**
   ```bash
   # Run smoke tests
   npm run test:e2e:smoke

   # Verify critical paths
   curl -X POST https://api.intelgraph.dev/graphql \
     -H "Content-Type: application/json" \
     -d '{"query":"query{health{status}}"}'
   ```

2. **Performance Validation**
   ```bash
   # Quick load test
   k6 run tools/k6/ga-cutover-scenarios.js --duration 10m --vus 20
   ```

3. **Security Validation**
   - Verify WebAuthn challenges work
   - Test policy enforcement
   - Check audit logging

4. **Cost Monitoring Activation**
   ```bash
   kubectl apply -f ops/cost-monitoring-config.yaml
   ```

## Rollback Procedures

### Immediate Rollback Triggers

Execute immediate rollback if any of these conditions occur:

- **Error Budget Burn:** > 6%/hour for 10+ minutes
- **Latency SLO Breach:** Both read and write latencies exceed thresholds for 15+ minutes
- **Security Incidents:** Critical security alerts or WebAuthn failure rate > 2%
- **ER Pipeline Failure:** Queue lag > 180s or DLQ rate > 0.5%
- **Cost Overrun:** Emergency budget alerts triggered

### Rollback Execution

1. **Activate Rollback**
   ```bash
   # Immediate traffic reduction
   kubectl patch deployment intelgraph-gateway -p '{"spec":{"template":{"metadata":{"annotations":{"canary.percentage":"0"}}}}}' -n intelgraph

   # Deploy previous version
   kubectl set image deployment/intelgraph-gateway api=ghcr.io/intelgraph/api:v0.4.9 -n intelgraph
   ```

2. **Disable New Features**
   ```bash
   # Disable WebAuthn enforcement
   kubectl patch configmap security-config -p '{"data":{"webauthn_enforce":"false"}}' -n intelgraph

   # Set OPA to permissive mode
   kubectl patch configmap opa-config -p '{"data":{"default_decision":"allow"}}' -n intelgraph

   # Disable PQ enforcement
   kubectl patch configmap graphql-config -p '{"data":{"pq_enforce":"false"}}' -n intelgraph
   ```

3. **Verify Rollback Success**
   ```bash
   # Check system health
   igctl status health

   # Verify metrics return to baseline
   # Monitor for 15 minutes
   ```

4. **Post-Rollback Actions**
   - Create incident ticket
   - Notify stakeholders
   - Preserve logs and metrics
   - Schedule post-mortem

## Post-Cutover Procedures (T+2h to T+24h)

### Immediate Post-Cutover (T+2h to T+6h)

1. **Hypercare Monitoring**
   - Monitor dashboards continuously
   - Check SLO compliance every 30 minutes
   - Verify cost tracking accuracy
   - Watch for any degradation

2. **Validation Tests**
   ```bash
   # Extended load test
   ./tools/k6/run-ga-validation.sh production soak

   # Comprehensive health check
   npm run test:health:comprehensive
   ```

3. **Documentation Updates**
   - Update deployment status
   - Record any issues encountered
   - Update runbooks based on learnings

### Extended Monitoring (T+6h to T+24h)

1. **Performance Analysis**
   - Compare metrics to pre-GA baseline
   - Analyze cost optimization effectiveness
   - Review adaptive sampling performance

2. **Security Monitoring**
   - Monitor for any security anomalies
   - Review audit logs
   - Validate provenance chain integrity

3. **User Experience Validation**
   - Monitor user-reported issues
   - Check support ticket volume
   - Verify feature adoption metrics

### 24-Hour Review (T+24h)

1. **Success Criteria Validation**
   - [ ] All SLOs met for 24 consecutive hours
   - [ ] No critical incidents
   - [ ] Cost budgets maintained
   - [ ] Security posture maintained
   - [ ] User satisfaction metrics stable

2. **Final Sign-off**
   - [ ] SRE Lead approval
   - [ ] Security Lead approval
   - [ ] Engineering Lead approval
   - [ ] Product Lead approval

3. **Change Freeze Lift**
   ```bash
   igctl freeze end --reason "GA cutover completed successfully"
   ```

## Emergency Contacts

### Primary Escalation
- **SRE On-call:** +1-555-SRE-ONCL
- **Engineering Manager:** alice@intelgraph.dev
- **Security Lead:** bob@intelgraph.dev

### Secondary Escalation
- **VP Engineering:** charlie@intelgraph.dev
- **CTO:** diana@intelgraph.dev

### Communication Channels
- **War Room:** #ga-cutover-war-room
- **SRE Alerts:** #sre-alerts
- **Engineering:** #engineering-alerts

## Key Dashboards

1. **GA Cutover Dashboard:** https://grafana.intelgraph.dev/d/ga-cutover
2. **SLO Dashboard:** https://grafana.intelgraph.dev/d/slo-overview
3. **Cost Dashboard:** https://grafana.intelgraph.dev/d/cost-guardrails
4. **Security Dashboard:** https://grafana.intelgraph.dev/d/security-overview

## Key Metrics to Watch

### Performance
- GraphQL read latency p95: ≤ 350ms
- GraphQL write latency p95: ≤ 700ms
- Neo4j 1-hop latency p95: ≤ 300ms
- Neo4j multi-hop latency p95: ≤ 1200ms

### Reliability
- API error rate: ≤ 0.1%
- Ingest error rate: ≤ 0.5%
- ER queue lag: ≤ 60s
- ER DLQ rate: ≤ 0.1%

### Security
- WebAuthn step-up rate: ≤ 0.5%
- OPA decision latency p95: ≤ 25ms
- Policy enforcement active: ✅
- Provenance verification: ✅

### Cost
- Infrastructure budget: ≤ $18k/month
- LLM budget: ≤ $5k/month
- Adaptive sampling reduction: 60-80%
- Budget alerts: None active

## Troubleshooting Guide

### High Latency Issues

**Symptoms:** GraphQL latencies exceed SLO thresholds

**Investigation:**
```bash
# Check cache hit rates
kubectl logs -l app=intelgraph-gateway | grep "cache_hit_rate"

# Check Neo4j performance
kubectl exec -it neo4j-primary-0 -- cypher-shell "CALL dbms.listQueries()"

# Check for hot queries
kubectl logs -l app=intelgraph-gateway | grep "slow_query"
```

**Mitigation:**
```bash
# Enable conservative caching
kubectl patch configmap graphql-config -p '{"data":{"cache_conservative":"true"}}'

# Increase cache TTLs
kubectl patch configmap redis-config -p '{"data":{"default_ttl":"3600"}}'
```

### ER Pipeline Issues

**Symptoms:** High queue lag or DLQ rate

**Investigation:**
```bash
# Check Kafka consumer lag
kubectl exec -it kafka-0 -- kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group er-consumer

# Check ER service health
kubectl logs -l app=er-pipeline --tail=100
```

**Mitigation:**
```bash
# Scale ER consumers
kubectl scale deployment er-pipeline --replicas=5

# Enable batch processing
kubectl patch configmap er-config -p '{"data":{"batch_mode":"true"}}'
```

### Security Issues

**Symptoms:** High WebAuthn failure rate or policy errors

**Investigation:**
```bash
# Check WebAuthn logs
kubectl logs -l app=intelgraph-gateway | grep "webauthn"

# Check OPA decision logs
kubectl logs -l app=opa
```

**Mitigation:**
```bash
# Reduce step-up sensitivity
kubectl patch configmap security-config -p '{"data":{"risk_threshold":"medium"}}'

# Enable policy debugging
kubectl patch configmap opa-config -p '{"data":{"debug_mode":"true"}}'
```

## Success Criteria

### Technical Success
- [ ] All SLOs met for 24 consecutive hours
- [ ] Zero critical incidents
- [ ] Cost budgets maintained within limits
- [ ] Security posture improved or maintained
- [ ] Provenance verification working end-to-end

### Business Success
- [ ] User experience maintained or improved
- [ ] No increase in support tickets
- [ ] Feature adoption tracking active
- [ ] GA announcement ready for publication

### Operational Success
- [ ] Team confidence in new processes
- [ ] Runbooks validated and updated
- [ ] Monitoring and alerting effective
- [ ] Change management processes working

---

**Document Version:** 1.0
**Last Updated:** September 17, 2025
**Next Review:** Sprint 27 Retrospective
**Owner:** SRE Team