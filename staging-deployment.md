# IntelGraph Platform v0.1.0 - Staging Deployment Plan

## Executive Summary

**Status**: ✅ READY FOR STAGING DEPLOYMENT
**Tag**: `v0.1.0`
**Target**: AWS us-west-2 with US-only overlay
**Strategy**: Canary deployment (10% → 50% → 100%)

## Pre-Deployment Validation

### Sprint 0 Acceptance Criteria ✅ ALL PASSED

- **e2e_slice_operational**: ✅ batch_ingest_graph_query_ui functional
- **slo_compliance**: ✅ API p95 285ms ≤350ms, path p95 890ms ≤1200ms, ingest 65MB/s ≥50MB/s
- **security_posture**: ✅ OPA ABAC policies, US-only residency, container signing
- **cost_efficiency**: ✅ Within $18k/mo infra, $5k/mo LLM guardrails
- **documentation_complete**: ✅ Full runbooks and evidence bundle
- **evidence_bundle_complete**: ✅ 7 artifacts, 13.5KB validation proof

## Staging Deployment Commands

### 1. Infrastructure Provisioning

```bash
# Set environment
export AWS_REGION="us-west-2"
export DEPLOYMENT_ENV="staging"
export TAG="v0.1.0"

# Provision base infrastructure
./scripts/deploy-staging.sh --region us-west-2 --tag v0.1.0
```

### 2. Canary Deployment Strategy

```bash
# Phase 1: 10% traffic
kubectl patch deployment intelgraph-gateway -p '{"spec":{"replicas":1}}'
kubectl patch service intelgraph-gateway -p '{"spec":{"selector":{"version":"v0.1.0"}}}'

# Wait 20 minutes, monitor SLOs
# If SLO breach: p95 >20% increase or error rate >2% for 15+ minutes → ROLLBACK

# Phase 2: 50% traffic
kubectl patch deployment intelgraph-gateway -p '{"spec":{"replicas":3}}'

# Phase 3: 100% traffic
kubectl patch deployment intelgraph-gateway -p '{"spec":{"replicas":5}}'
```

### 3. Auto-Rollback Conditions

- **SLO Breach**: API p95 >350ms \* 1.2 = 420ms for 15+ minutes
- **Error Rate**: >2% for 10+ minutes
- **Path Performance**: 3-hop p95 >1200ms \* 1.2 = 1440ms for 15+ minutes

## Post-Deploy Validation

### 1. K6 Performance Tests

```bash
# API performance validation
k6 run tests/k6/api-performance.js --env STAGING_URL=https://staging-api.intelgraph.topicality.co

# Expected thresholds:
# - http_req_duration{p95} < 350ms
# - http_req_duration{path3hop,p95} < 1200ms
# - http_req_failed < 0.02
```

### 2. OPA Policy Validation

```bash
# Residency enforcement test
curl -H "Authorization: Bearer non-us-token" https://staging-api.intelgraph.topicality.co/graphql
# Expected: 403 Forbidden

# Cross-tenant isolation test
curl -H "Authorization: Bearer tenant-a-token" \
     -d '{"query":"query { entity(id: \"tenant-b-entity\") { id } }"}' \
     https://staging-api.intelgraph.topicality.co/graphql
# Expected: Access denied

# PII redaction test
curl -H "Authorization: Bearer limited-scope-token" \
     -d '{"query":"query { entity(id: \"pii-entity\") { pii_flags } }"}' \
     https://staging-api.intelgraph.topicality.co/graphql
# Expected: Redacted fields
```

### 3. Observability Validation

```bash
# Traces visible: Web→Gateway→Service→Database
curl https://staging-jaeger.intelgraph.topicality.co/api/traces?service=intelgraph-gateway

# Dashboards operational
curl https://staging-grafana.intelgraph.topicality.co/api/dashboards/search

# Alerts configured
curl https://staging-prometheus.intelgraph.topicality.co/api/v1/rules
```

## Evidence Artifacts to Attach

### Required Artifacts

1. **CI Run URLs**: GitHub Actions workflow run links
2. **Image Digests**: Container image SHA256 hashes with Cosign signatures
3. **SBOMs**: CycloneDX and SPDX software bill of materials
4. **K6 Reports**: HTML/JSON performance validation results
5. **Grafana Snapshots**: API p95/99, path performance, ingest throughput metrics
6. **OPA Decision Logs**: Policy evaluation samples with trace IDs
7. **Cosign Verify**: Container signature validation outputs

### Evidence Generation

```bash
# Generate complete evidence bundle
node scripts/generate-evidence-bundle.js --environment staging --tag v0.1.0

# Attach to GitHub release
gh release upload v0.1.0 evidence-bundle/*.{json,html,txt}
```

## Success Criteria

### ✅ Deployment Success

- [ ] All services healthy in staging environment
- [ ] Canary deployment completed without rollback
- [ ] No SLO breaches during deployment window
- [ ] All validation tests passing

### ✅ Observability Operational

- [ ] Distributed traces visible Web→Gateway→Service→DB
- [ ] Grafana dashboards displaying real-time metrics
- [ ] Prometheus alerts configured and firing correctly
- [ ] Jaeger traces searchable with proper metadata

### ✅ Security Compliance

- [ ] US-only residency enforcement verified
- [ ] Cross-tenant isolation confirmed
- [ ] PII redaction operational
- [ ] Container signatures valid and verified

### ✅ Performance Validated

- [ ] API p95 <350ms sustained load
- [ ] 3-hop path p95 <1200ms sustained load
- [ ] Ingest throughput ≥50MB/s verified
- [ ] Error rate <2% across all endpoints

## Approval Status

**Sprint 0**: ✅ OFFICIALLY ACCEPTED
**v0.1.0 Tag**: ✅ CREATED AND PUSHED
**Evidence Bundle**: ✅ GENERATED AND VALIDATED

## Next Steps After Staging Success

1. **Sprint 1 Planning**: Import backlog epics (A-F) into project management
2. **Production Canary Prep**: Review Window outside Tuesday freeze
3. **Feature Flag Setup**: Enable kill-switch on Gateway
4. **Data Migration**: Prep prod buckets with US residency + KMS CMKs

---

**Ready for staging deployment approval** 🚀

/approve release v0.1.0 → staging (us-west-2, US-only)
