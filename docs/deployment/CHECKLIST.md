# Production Deployment Checklist

## Pre-Deployment
- [ ] All tests passing (unit, integration, E2E)
- [ ] Evidence validation enabled for all operations
- [ ] Rate limits configured per tier
- [ ] Circuit breakers tested with fault injection
- [ ] Health check endpoints verified
- [ ] Distributed tracing configured (OTLP endpoint)
- [ ] CDC replication slots created
- [ ] Notification digest workers scheduled
- [ ] Agent registry initialized with ATF levels

## Deployment
- [ ] Database migrations applied
- [ ] Neo4j schema constraints created
- [ ] Redis persistence configured
- [ ] Environment secrets rotated
- [ ] TLS certificates valid (>30 days)
- [ ] Load balancer health checks configured
- [ ] Horizontal pod autoscaler configured (K8s)

## Post-Deployment
- [ ] Smoke tests passed
- [ ] Metrics dashboards showing data
- [ ] Alert rules firing correctly
- [ ] Evidence ledger accumulating entries
- [ ] CDC lag < 5 seconds
- [ ] API latency p95 < 500ms
- [ ] No error spikes in logs

## Rollback Plan
If critical issues:
1. Revert K8s deployment: `kubectl rollout undo deployment/summit-api`
2. Stop CDC consumers to prevent data corruption
3. Drain Redis notification queue
4. Notify users of service degradation
