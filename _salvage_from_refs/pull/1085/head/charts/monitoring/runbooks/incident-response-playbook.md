# IntelGraph Incident Response Playbook

## Overview

This playbook provides structured response procedures for IntelGraph platform incidents, ensuring rapid resolution and minimal business impact.

## Incident Severity Levels

### Critical (P0)
- **Impact**: Complete service outage or major security breach
- **Response Time**: 5 minutes
- **Escalation**: Immediate page to on-call engineer + incident commander
- **Examples**: Maestro service down, database unreachable, security incident

### High (P1)
- **Impact**: Significant degradation affecting multiple users
- **Response Time**: 15 minutes
- **Escalation**: Page to on-call engineer
- **Examples**: High error rates, severe performance degradation

### Medium (P2)
- **Impact**: Minor degradation or single component issues
- **Response Time**: 1 hour
- **Escalation**: Slack notification to team channel
- **Examples**: Elevated error rates, moderate performance issues

### Low (P3)
- **Impact**: Minor issues with workarounds available
- **Response Time**: 4 hours during business hours
- **Escalation**: Ticket creation
- **Examples**: Non-critical feature issues, cosmetic problems

## General Incident Response Process

### 1. Detection & Acknowledgment (0-5 minutes)
1. **Acknowledge Alert**: Respond to PagerDuty/Slack notification
2. **Initial Assessment**: Determine severity level
3. **Create Incident**: Use incident management tool (StatusPage/Opsgenie)
4. **Notify Stakeholders**: Update status page if customer-facing

### 2. Investigation & Diagnosis (5-15 minutes)
1. **Access Monitoring**: 
   - Grafana: https://grafana.intelgraph.ai
   - Jaeger: https://jaeger.intelgraph.ai
   - Logs: https://loki.intelgraph.ai
2. **Check Dependencies**: Database, external APIs, networking
3. **Review Recent Changes**: Deployments, configuration updates
4. **Gather Context**: Error messages, affected components

### 3. Mitigation & Resolution
1. **Implement Fix**: Follow specific runbook procedures
2. **Monitor Recovery**: Verify metrics return to normal
3. **Test Functionality**: Confirm service restoration
4. **Document Actions**: Record all steps taken

### 4. Post-Incident (Within 24 hours)
1. **Update Status Page**: Confirm full resolution
2. **Conduct Post-Mortem**: If P0/P1 incident
3. **Create Action Items**: Prevent recurrence
4. **Update Runbooks**: Improve documentation

## Critical Alert Runbooks

### MaestroServiceDown

**Symptoms**: Maestro orchestrator pods not responding
**Impact**: Complete AI orchestration failure

#### Immediate Actions:
```bash
# Check pod status
kubectl get pods -n default -l app.kubernetes.io/name=maestro

# Check recent events
kubectl describe pods -n default -l app.kubernetes.io/name=maestro

# Check logs
kubectl logs -n default -l app.kubernetes.io/name=maestro --tail=100

# Check resource usage
kubectl top pods -n default -l app.kubernetes.io/name=maestro
```

#### Diagnosis Steps:
1. **Resource Exhaustion**: Check if pods are OOMKilled or CPU throttled
2. **Configuration Issues**: Verify ConfigMaps and Secrets
3. **Dependency Failure**: Check database and Redis connectivity
4. **Image Issues**: Verify container image exists and is pullable

#### Resolution Steps:
1. **Quick Fix**: Restart deployment if resource issue
   ```bash
   kubectl rollout restart deployment/maestro-orchestrator -n default
   ```

2. **Scale Up**: If resource constrained
   ```bash
   kubectl scale deployment/maestro-orchestrator --replicas=5 -n default
   ```

3. **Rollback**: If recent deployment caused issue
   ```bash
   kubectl rollout undo deployment/maestro-orchestrator -n default
   ```

#### Prevention:
- Implement proper resource requests/limits
- Add readiness/liveness probes
- Use PodDisruptionBudgets
- Monitor resource utilization trends

### Neo4jDatabaseDown

**Symptoms**: Graph database unreachable, connection timeouts
**Impact**: No graph operations, investigation data unavailable

#### Immediate Actions:
```bash
# Check Neo4j pods
kubectl get pods -n database -l app=neo4j

# Check Neo4j logs
kubectl logs -n database -l app=neo4j --tail=50

# Test connectivity
kubectl exec -it deploy/maestro-orchestrator -n default -- \
  curl -v http://neo4j.database.svc.cluster.local:7474
```

#### Diagnosis Steps:
1. **Pod Health**: Check if Neo4j pods are running
2. **Storage Issues**: Verify PVC status and disk space
3. **Memory/CPU**: Check resource utilization
4. **Network**: Test service discovery and connectivity

#### Resolution Steps:
1. **Restart Neo4j**: If simple pod issue
   ```bash
   kubectl rollout restart statefulset/neo4j -n database
   ```

2. **Check Storage**: If storage-related
   ```bash
   kubectl get pvc -n database
   kubectl describe pvc neo4j-data -n database
   ```

3. **Scale Resources**: If resource constrained
   ```bash
   kubectl patch statefulset neo4j -n database -p \
     '{"spec":{"template":{"spec":{"containers":[{"name":"neo4j","resources":{"requests":{"memory":"4Gi","cpu":"2"}}}]}}}}'
   ```

### HighErrorRate

**Symptoms**: Error rate > 10% on API endpoints
**Impact**: User experience degradation, potential data loss

#### Immediate Actions:
```bash
# Check current error rate
kubectl exec -it deploy/maestro-orchestrator -n default -- \
  curl -s http://localhost:9464/metrics | grep maestro_orchestration_errors_total

# Check recent logs for error patterns
kubectl logs -n default -l app.kubernetes.io/name=maestro --since=10m | grep ERROR
```

#### Diagnosis Steps:
1. **Error Types**: Identify common error messages
2. **Affected Endpoints**: Determine which APIs are failing
3. **External Dependencies**: Check third-party service status
4. **Rate Limiting**: Verify not hitting API limits

#### Resolution Steps:
1. **Circuit Breaker**: Enable if available
2. **Reduce Load**: Scale down non-critical operations
3. **Failover**: Switch to backup services if configured
4. **Configuration Fix**: Update problematic settings

### SecurityEventSpike

**Symptoms**: Unusual security event patterns
**Impact**: Potential security breach, data exposure risk

#### Immediate Actions:
```bash
# Check security event details
kubectl logs -n default -l app.kubernetes.io/name=maestro --since=5m | grep SECURITY

# Review recent authentication failures
curl -s "http://prometheus:9090/api/v1/query?query=maestro_authentication_attempts_total{status=\"failed\"}"
```

#### Diagnosis Steps:
1. **Event Types**: Categorize security events
2. **Source Analysis**: Identify attack origins
3. **Pattern Recognition**: Look for coordinated attacks
4. **System Compromise**: Check for unauthorized access

#### Escalation:
- **Immediate**: Contact security team
- **Severe**: Activate incident commander
- **Critical**: Consider service isolation

## Monitoring Dashboard URLs

### Primary Dashboards
- **Platform Overview**: https://grafana.intelgraph.ai/d/intelgraph-overview
- **Maestro System**: https://grafana.intelgraph.ai/d/maestro-orchestration
- **Kubernetes Infrastructure**: https://grafana.intelgraph.ai/d/kubernetes-infrastructure
- **Security Events**: https://grafana.intelgraph.ai/d/security-monitoring

### Troubleshooting Tools
- **Distributed Tracing**: https://jaeger.intelgraph.ai
- **Log Aggregation**: https://grafana.intelgraph.ai/explore (Loki)
- **Metrics Explorer**: https://grafana.intelgraph.ai/explore (Prometheus)

## Communication Templates

### Status Page Update (Critical)
```
🚨 INVESTIGATING: We are currently experiencing issues with [SERVICE]. 
Users may experience [IMPACT]. Our engineering team is actively investigating. 
Updates will be provided every 15 minutes.
```

### Slack Notification (High)
```
🔥 P1 Alert: [ALERT_NAME]
📊 Impact: [DESCRIPTION]
🔍 Investigation: [CURRENT_STATUS]
👨‍💻 DRI: @[USERNAME]
📈 Dashboard: [GRAFANA_LINK]
```

### Resolution Update
```
✅ RESOLVED: The issue affecting [SERVICE] has been resolved at [TIME]. 
All systems are operating normally. A post-mortem will be conducted 
and shared within 24 hours.
```

## Escalation Contacts

### On-Call Rotation
- **Platform Engineering**: platform-oncall@intelgraph.ai
- **Data Engineering**: data-oncall@intelgraph.ai
- **AI/ML Engineering**: ai-oncall@intelgraph.ai
- **Security Team**: security-oncall@intelgraph.ai

### Management Escalation
- **Engineering Manager**: eng-manager@intelgraph.ai
- **VP Engineering**: vp-eng@intelgraph.ai
- **CTO**: cto@intelgraph.ai

## Tools & Access

### Required Access
- **Kubernetes**: kubectl configured for production cluster
- **Grafana**: SSO login with admin privileges
- **PagerDuty**: On-call schedule and incident management
- **AWS Console**: EKS, RDS, ElastiCache access
- **GitHub**: Repository access for code changes

### Emergency Procedures
1. **Break Glass Access**: Emergency admin access via sealed envelope
2. **Service Account**: Use emergency service account for kubectl
3. **Backup Communication**: Use personal devices if Slack is down
4. **Documentation**: Local copies of critical runbooks

## Post-Incident Process

### Post-Mortem Template
1. **Timeline**: Detailed chronology of events
2. **Root Cause**: Technical and process causes
3. **Impact Assessment**: Customer and business impact
4. **Response Evaluation**: What went well/poorly
5. **Action Items**: Concrete steps to prevent recurrence
6. **Follow-Up**: Assign owners and due dates

### Learning Integration
- Update monitoring and alerting rules
- Enhance automation and tooling
- Improve documentation and training
- Share lessons learned with broader team

## Testing & Validation

### Chaos Engineering
- Regular failure injection testing
- Disaster recovery drills
- Alert validation exercises
- Runbook testing and updates

### Metrics for Success
- **MTTR** (Mean Time To Recovery): Target < 15 minutes for P0
- **MTTD** (Mean Time To Detection): Target < 5 minutes
- **False Positive Rate**: Target < 5%
- **Runbook Accuracy**: Target > 95% success rate