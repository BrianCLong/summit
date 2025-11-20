# On-Call Guide Template

## Purpose
This guide provides on-call engineers with essential information for responding to incidents and maintaining service reliability.

---

## Table of Contents
1. [On-Call Rotation](#on-call-rotation)
2. [Incident Response](#incident-response)
3. [Escalation Procedures](#escalation-procedures)
4. [Common Incidents](#common-incidents)
5. [Emergency Contacts](#emergency-contacts)
6. [Break-Glass Procedures](#break-glass-procedures)
7. [Post-Incident](#post-incident)

---

## On-Call Rotation

### Schedule
- **Tool:** `[PagerDuty / Opsgenie / VictorOps]`
- **Rotation:** `[Weekly / Bi-weekly]`
- **Handoff Time:** `[Monday 9:00 AM PT]`
- **View Schedule:** `[Link to on-call calendar]`

### Responsibilities
- ✅ Respond to alerts within **15 minutes**
- ✅ Triage and resolve P0/P1 incidents
- ✅ Escalate when necessary (see [Escalation](#escalation-procedures))
- ✅ Document all incidents in `[incident tracking tool]`
- ✅ Conduct handoff with next on-call engineer

### Prerequisites
Before your on-call shift:
- [ ] Access to production infrastructure (VPN, AWS console, Kubernetes)
- [ ] PagerDuty/Opsgenie app installed and configured
- [ ] Access to monitoring dashboards (Grafana, Datadog)
- [ ] Access to logs (Kibana, CloudWatch, Splunk)
- [ ] Slack/Teams notifications enabled
- [ ] Reviewed recent incidents and postmortems
- [ ] Tested break-glass access (read-only test)

---

## Incident Response

### Severity Levels

| Severity | Description | Response Time | Escalation |
|----------|-------------|---------------|------------|
| **P0 (Critical)** | Complete service outage, data loss, security breach | **Immediate** (< 5 min) | Escalate after 30 min |
| **P1 (High)** | Major degradation, multiple users affected | **15 minutes** | Escalate after 60 min |
| **P2 (Medium)** | Limited impact, workaround available | **2 hours** | If unresolved after 4 hours |
| **P3 (Low)** | Minor issue, few users affected | **Next business day** | N/A |

---

### Incident Response Workflow

#### 1. Acknowledge Alert (0-5 minutes)
```bash
# Acknowledge in PagerDuty
# Post in Slack #incidents channel
"🚨 Acknowledging P0 incident: [Brief description]. Investigating now."
```

#### 2. Initial Assessment (5-15 minutes)
- **Check dashboards:** Is the service down? Degraded?
- **Check recent deploys:** Any recent changes? (check CI/CD pipeline)
- **Check dependencies:** Are upstream/downstream services healthy?
- **Check error rates:** What's the error pattern? (logs, metrics)

**Quick Links:**
- Grafana: `[Production dashboard URL]`
- Kibana/Logs: `[Log aggregation URL]`
- Kubernetes: `kubectl get pods -A | grep -v Running`
- Status Page: `[External status page URL]`

#### 3. Communicate Status (15 minutes)
```bash
# Post update in Slack #incidents
"📊 Status Update:
- Service: [service-name]
- Impact: [X% of users affected]
- Root cause hypothesis: [initial theory]
- ETA for fix: [best guess or "investigating"]
- Next update: [15 minutes]"
```

#### 4. Mitigate & Resolve
- **Rollback:** If recent deploy caused issue: `kubectl rollout undo deployment/[name]`
- **Scale:** If resource exhaustion: `kubectl scale deployment/[name] --replicas=10`
- **Restart:** If memory leak/crash: `kubectl rollout restart deployment/[name]`
- **Kill pod:** If single pod is stuck: `kubectl delete pod [pod-name]`
- **Circuit breaker:** If dependency is down, enable fallback mode

**See:** [Common Incidents](#common-incidents) for detailed runbooks

#### 5. Monitor & Verify
- Confirm metrics return to normal (error rate, latency, throughput)
- Check status page or ping affected users
- Monitor for 15-30 minutes to ensure stability

#### 6. Post Regular Updates
- Update **every 15-30 minutes** during active incident
- Update status page (if customer-facing)
- Update Slack #incidents channel

#### 7. Resolve & Document
```bash
# Mark resolved in PagerDuty
# Post final update in Slack
"✅ RESOLVED: [incident summary]
- Duration: [X minutes]
- Root cause: [brief explanation]
- Fix: [what was done]
- Follow-up: [link to postmortem ticket]"
```

---

## Escalation Procedures

### When to Escalate
- ⚠️ Unable to resolve within severity time limits
- ⚠️ Need domain expertise (e.g., database corruption, security breach)
- ⚠️ Need additional permissions (production write access)
- ⚠️ Incident scope is expanding
- ⚠️ Data loss or security implications

### Escalation Contacts

| Team/Role | Contact | When to Escalate |
|-----------|---------|------------------|
| **On-Call Manager** | `[PagerDuty: Manager Escalation]` | After 30 min (P0) or 60 min (P1) |
| **Platform Lead** | `@platform-lead (Slack)` | Infrastructure/Kubernetes issues |
| **Database Lead** | `@db-lead (Slack)` | Database corruption, query issues |
| **Security Lead** | `@security-lead (Slack)` | Security breach, data leak |
| **Executive (CTO)** | `[Phone number]` | P0 lasting > 2 hours |

### Escalation Process
1. **Notify in Slack:** Tag appropriate lead in #incidents channel
2. **Call if urgent:** Use phone number for P0 incidents
3. **Provide context:**
   - Incident summary
   - Impact (users/revenue affected)
   - What's been tried
   - What you need (expertise, permissions, decision)

---

## Common Incidents

### 🔴 Database Connection Pool Exhausted

**Symptoms:**
- Errors: "No available connections" or "Connection timeout"
- Services returning 503 errors
- Database CPU/connections at 100%

**Quick Diagnosis:**
```bash
# Check connection count
kubectl exec -it postgres-0 -- psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
kubectl exec -it postgres-0 -- psql -U postgres -c "SELECT pid, now() - query_start as duration, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC LIMIT 10;"
```

**Resolution:**
1. **Kill long-running queries:**
   ```bash
   kubectl exec -it postgres-0 -- psql -U postgres -c "SELECT pg_terminate_backend([PID]);"
   ```
2. **Restart leaking service:**
   ```bash
   kubectl rollout restart deployment/[service-name]
   ```
3. **Increase pool size (temporary):**
   ```bash
   kubectl set env deployment/[service] DB_POOL_SIZE=50
   ```

**Runbook:** `docs/runbooks/database-connection-pool.md`

---

### 🔴 Memory Leak / OOMKilled Pods

**Symptoms:**
- Pods in CrashLoopBackOff state
- Kubernetes events show "OOMKilled"
- Memory usage climbing over time

**Quick Diagnosis:**
```bash
# Check pod status
kubectl get pods -n production | grep -i oom

# Check memory usage
kubectl top pods -n production --sort-by=memory

# View events
kubectl describe pod [pod-name] | grep -i oom
```

**Resolution:**
1. **Restart affected pods:**
   ```bash
   kubectl delete pod [pod-name]
   ```
2. **Increase memory limit (temporary):**
   ```bash
   kubectl set resources deployment/[name] -c=[container] --limits=memory=2Gi
   ```
3. **Scale horizontally:**
   ```bash
   kubectl scale deployment/[name] --replicas=5
   ```
4. **Investigate leak:**
   - Check recent code changes
   - Enable heap profiling (if supported)
   - Review logs for patterns

**Runbook:** `docs/runbooks/memory-leak.md`

---

### 🔴 Service Not Responding / High Latency

**Symptoms:**
- P95 latency > 5s (normal: < 500ms)
- Timeouts in downstream services
- Users reporting slow page loads

**Quick Diagnosis:**
```bash
# Check service health
curl https://[service]/health

# Check pod status
kubectl get pods -l app=[service-name]

# Check logs for errors
kubectl logs -l app=[service-name] --tail=100 | grep -i error

# Check resource usage
kubectl top pods -l app=[service-name]
```

**Resolution:**
1. **Restart hanging pods:**
   ```bash
   kubectl rollout restart deployment/[name]
   ```
2. **Scale up if CPU/memory high:**
   ```bash
   kubectl scale deployment/[name] --replicas=10
   ```
3. **Check dependencies:** Is a downstream service slow/down?
   ```bash
   # Check Redis
   redis-cli -h redis.svc.cluster.local ping

   # Check Neo4j
   curl http://neo4j.svc.cluster.local:7474/db/neo4j/cluster/available
   ```
4. **Rollback if recent deploy:**
   ```bash
   kubectl rollout undo deployment/[name]
   ```

**Runbook:** `docs/runbooks/high-latency.md`

---

### 🔴 Authentication/Authorization Failures

**Symptoms:**
- Users unable to log in
- 401/403 errors spiking
- "Invalid token" or "Unauthorized" errors

**Quick Diagnosis:**
```bash
# Check auth service
kubectl get pods -l app=authz-gateway
kubectl logs -l app=authz-gateway --tail=50

# Check OPA service
kubectl exec -it opa-0 -- wget -O- http://localhost:8181/health

# Check OIDC provider (Keycloak)
curl https://keycloak.example.com/health
```

**Resolution:**
1. **Restart auth gateway:**
   ```bash
   kubectl rollout restart deployment/authz-gateway
   ```
2. **Check OPA bundle updates:**
   ```bash
   kubectl logs -l app=opa | grep bundle
   ```
3. **Verify OIDC provider:**
   - Check Keycloak/Auth0 status page
   - Verify JWKS endpoint: `curl https://keycloak.example.com/.well-known/jwks.json`
4. **Emergency bypass (ONLY IF CRITICAL):**
   - See [Break-Glass Procedures](#break-glass-procedures)

**Runbook:** `docs/runbooks/auth-outage.md`

---

### 🔴 Neo4j Database Down

**Symptoms:**
- Graph queries failing
- Errors: "ServiceUnavailable" or "Connection refused"
- Neo4j pods not ready

**Quick Diagnosis:**
```bash
# Check Neo4j pods
kubectl get pods -l app=neo4j

# Check Neo4j logs
kubectl logs neo4j-0 --tail=100

# Check cluster status (if clustered)
kubectl exec -it neo4j-0 -- cypher-shell -u neo4j -p [password] "SHOW DATABASES;"
```

**Resolution:**
1. **Restart Neo4j pod:**
   ```bash
   kubectl delete pod neo4j-0
   ```
2. **Check disk space:**
   ```bash
   kubectl exec -it neo4j-0 -- df -h
   ```
3. **Check memory:**
   ```bash
   kubectl top pod neo4j-0
   ```
4. **If corruption suspected:**
   - Restore from backup (see `docs/runbooks/neo4j-restore.md`)

**Runbook:** `docs/runbooks/neo4j-outage.md`

---

## Emergency Contacts

### Internal Contacts
| Role | Name | Slack | Phone | Availability |
|------|------|-------|-------|--------------|
| **On-Call Manager** | `[Name]` | `@manager` | `[###-###-####]` | 24/7 |
| **Platform Lead** | `[Name]` | `@platform-lead` | `[###-###-####]` | Business hours + escalation |
| **Database Lead** | `[Name]` | `@db-lead` | `[###-###-####]` | Business hours + escalation |
| **Security Lead** | `[Name]` | `@security` | `[###-###-####]` | 24/7 |
| **CTO** | `[Name]` | `@cto` | `[###-###-####]` | P0 only |

### External Contacts
| Vendor | Purpose | Support URL | Phone |
|--------|---------|-------------|-------|
| **AWS** | Cloud infrastructure | [AWS Support] | `[Premium support number]` |
| **Neo4j** | Database support | [Neo4j Support] | `[Enterprise support]` |
| **PagerDuty** | Incident management | support@pagerduty.com | - |

---

## Break-Glass Procedures

### When to Use Break-Glass
- ⚠️ Production is down and normal remediation isn't working
- ⚠️ Need immediate access to production systems
- ⚠️ Security incident requiring immediate action
- ⚠️ Data loss imminent

### Authorization Required
- **P0 Incidents:** On-call engineer can use break-glass
- **P1 Incidents:** Requires manager approval
- **All other cases:** Requires VP Engineering approval

### Break-Glass Access

#### 1. AWS Emergency Access
```bash
# Use break-glass IAM role (logged and audited)
aws sts assume-role --role-arn arn:aws:iam::ACCOUNT:role/BreakGlassAdmin --role-session-name oncall-incident-[ticket-id]
```

#### 2. Kubernetes Admin Access
```bash
# Use emergency kubeconfig (time-limited)
export KUBECONFIG=~/.kube/breakglass-config
kubectl auth can-i '*' '*' --all-namespaces  # Verify admin access
```

#### 3. Database Direct Access
```bash
# Connect directly to production database (bypassing connection pooling)
kubectl port-forward svc/postgres 5432:5432
psql -h localhost -U postgres -d intelgraph
```

#### 4. Disable OPA Temporarily
```bash
# ONLY IF AUTH SYSTEM IS BLOCKING EMERGENCY FIX
kubectl scale deployment/opa --replicas=0
# REMEMBER TO RE-ENABLE: kubectl scale deployment/opa --replicas=3
```

### Break-Glass Logging
- **All break-glass access is logged** to `[audit logging system]`
- **Document usage** in incident ticket with justification
- **Report to security team** within 24 hours

---

## Post-Incident

### Immediate Actions
1. **Mark incident resolved** in PagerDuty
2. **Post final update** in Slack #incidents
3. **Update status page** (if customer-facing)
4. **Create postmortem ticket** in `[Jira/GitHub/Linear]`

### Postmortem Process
- **Timeline:** Postmortem due within **5 business days** of P0/P1 incidents
- **Template:** `docs/templates/POSTMORTEM_TEMPLATE.md`
- **Review Meeting:** Schedule blameless postmortem review
- **Action Items:** Track follow-up work in backlog

### Postmortem Contents
- Timeline of events
- Root cause analysis (5 Whys)
- What went well / What went wrong
- Action items to prevent recurrence

**Template:** `docs/templates/POSTMORTEM_TEMPLATE.md`

---

## Quick Reference Links

### Dashboards
- **Production Overview:** `[Grafana URL]`
- **Service Health:** `[Status dashboard URL]`
- **Alerts:** `[PagerDuty/Prometheus URL]`

### Logs & Tracing
- **Logs:** `[Kibana/CloudWatch/Datadog URL]`
- **Traces:** `[Jaeger URL]`
- **APM:** `[New Relic/Datadog APM URL]`

### Runbooks
- **All Runbooks:** `docs/runbooks/`
- **Common Incidents:** `docs/runbooks/common-incidents.md`

### Tools
- **Kubernetes:** `kubectl config use-context production`
- **AWS Console:** `[AWS console URL]`
- **PagerDuty:** `[PagerDuty URL]`

---

## On-Call Handoff Checklist

When ending your on-call shift:
- [ ] Summarize incidents from your shift
- [ ] Note any ongoing issues or monitoring needed
- [ ] Share any context on recent deployments
- [ ] Review upcoming maintenance windows
- [ ] Confirm next on-call engineer is ready
- [ ] Update handoff doc: `docs/oncall-handoff.md`

---

## Questions?
- **Slack:** `#oncall-support`
- **Email:** `oncall@example.com`
- **Runbook Issues:** File in GitHub under `docs/runbooks/`

**Remember: When in doubt, escalate early. Better to over-communicate than under-communicate during incidents.**
