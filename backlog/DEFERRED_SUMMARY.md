# Deferred Backlog Summary

**Generated:** 2026-02-06
**Purpose:** Consolidated view of all deferred backlog items with prioritization recommendations

## Priority Legend
- **P0**: Security-critical, should be addressed immediately
- **P1**: Important for stability/compliance, address in next sprint
- **P2**: Nice-to-have, address when capacity allows
- **P3**: Future/research items

---

## P0: Security-Critical (Immediate)

### 1. n8n Credential Rotation
- **File**: `threat-intel-backlog-2026-01-22.md`
- **Status**: Runbook created, awaiting DevOps execution
- **Action**: Execute `runbooks/n8n-credential-rotation.md`

---

## P1: Ready to Implement (Next Sprint)

### 2. Shai-Hulud Supply Chain Security
- **File**: `shai-hulud-supply-chain.yaml`
- **Status**: ✅ Blocker resolved (required checks discovery complete)
- **Items**:
  - Subsumption bundle verifier + fixtures
  - Deny-by-default npm lifecycle script policy gate
- **Recommendation**: Prioritize for next sprint, security-relevant

### 3. Branch Protection as Code
- **File**: `branch-protection-as-code.yaml`
- **Status**: Blocked on admin token + org policy alignment
- **Item**: Org-wide enforcement across all repos
- **Recommendation**: Coordinate with governance team

---

## P2: Blocked on Dependencies

### 4. MCP Apps
- **File**: `mcp-apps.yaml`
- **Items**:
  - Real adapter implementation (needs security audit)
  - Signature key management (pending infra)
- **Recommendation**: Schedule security audit, coordinate with infra team

### 5. Ingress-NGINX Retirement
- **File**: `ingress-nginx-retirement.yaml`
- **Items**:
  - Gateway API scaffold generator (Lane 2 constraint)
  - Cluster inventory exporter (pending platform access)
  - Controller selection matrix (needs owner sign-off)
  - Rollout automation (pending ops readiness)
- **Recommendation**: Requires cross-team coordination

### 6. Subsumption Bundle Framework
- **File**: `subsumption-bundle-framework.yaml`
- **Items**:
  - Scheduled drift monitor workflow (not required for MWS)
  - API-based required-check discovery automation (needs repo token/permissions)
- **Recommendation**: Discovery automation now less urgent (manual discovery completed)

---

## P3: Future/Research

### 7. Graph Hybrid
- **File**: `graph-hybrid.yaml`
- **Items**:
  - Hybrid retrieval adapter (innovation lane)
  - AWS Bedrock GraphRAG adapter (avoid cloud coupling during GA)
- **Recommendation**: Keep deferred during GA hardening

### 8. Expectation Baselines
- **File**: `expectation-baselines.yaml`
- **Items**:
  - Cross-layer time-slice alignment engine (not required for MWS)
  - Confidence elasticity + survivability scoring (innovation lane)
- **Recommendation**: Innovation lane items, low priority

### 9. Claim-Level GraphRAG
- **File**: `claim-level-graphrag.yaml`
- **Items**:
  - Claim-level graph provenance adapters (Lane 2 feature)
- **Recommendation**: Keep deferred

### 10. Automation Turns 3 & 6
- **Files**: `automation-turn-3.yaml`, `automation-turn-6.yaml`
- **Items**:
  - Ingest real ITEM claims + APIs
- **Recommendation**: Foundation phase focus, keep deferred

### 11. Item Missing/Unknown
- **Files**: `item-missing.yaml`, `item-unknown.yaml`
- **Items**:
  - ITEM-specific claim registry, eval harness, drift detection
- **Recommendation**: Awaiting source excerpts, keep deferred

---

## Summary by Priority

| Priority | Count | Action |
|----------|-------|--------|
| P0 | 1 | Execute runbook immediately |
| P1 | 2 | Plan for next sprint |
| P2 | 3 | Coordinate dependencies |
| P3 | 5 | Keep deferred |

## Changes Made Today (2026-02-06)

1. **Unblocked**: shai-hulud-supply-chain (required checks discovery completed)
2. **Documented**: n8n credential rotation runbook created
3. **CVEs Resolved**: All 4 previously ignored CVEs addressed
4. **OPA Gaps Fixed**: CompanyOS tenant-api now has OPA integration

---

## Next Steps

1. DevOps: Execute n8n credential rotation runbook
2. Sprint Planning: Include shai-hulud-supply-chain items
3. Governance Team: Align on branch-protection-as-code requirements
4. Security Team: Schedule MCP apps security audit
