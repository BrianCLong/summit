# Evidence ID Consistency Gate - Rollout Plan (v1.3.0)

## Executive Summary

The Evidence ID Consistency Gate v1.3.0 is production-ready for enterprise deployment. This document outlines the phased rollout strategy across governance-critical repositories to maximize adoption while minimizing disruption.

## Rollout Phases

### Phase 1: Canary Deployment (Week 1-2)
**Target Repositories**: 
- `summit/core-platform`
- `summit/governance-docs`

**Configuration**: 
```bash
ENABLE_QWEN_ANALYSIS=false  # Pure static analysis first
EVIDENCE_ID_GATE_MODE=analysis-only
```

**Success Metrics**:
- Gate runs successfully (0 crash rate)
- Execution time <100ms consistently
- No false positive rate >5%

**Escalation Path**:
- Slack: #governance-team
- Backup: Disable gate entirely (remove from CI) for immediate remediation

### Phase 2: Extended Testing (Week 3-4)
**Target Repositories**:
- `summit/security-controls`
- `summit/compliance-suite`
- `sumit/ops-handbook`

**Configuration**:
```bash
ENABLE_QWEN_ANALYSIS=true    # Enable AI analysis  
ENABLE_QWEN_PATCHES=false    # Patches disabled initially
EVIDENCE_ID_GATE_MODE=warnings-only
```

**Success Metrics**:
- All governance documents processed
- AI analysis provides meaningful insights (>80% actionable findings)
- No PII/secets in AI responses or logs

### Phase 3: Production Graduation (Week 5-6)
**Target Repositories**:
- All `summit/ga-*` repos
- Top 10 governance-heavy repositories by commit frequency

**Configuration**:
```bash
ENABLE_QWEN_ANALYSIS=true    # AI analysis enabled
ENABLE_QWEN_PATCHES=true     # AI patch generation enabled
QWEN_PATCHES_FAIL_ON_HIGH=true  # Block on high severity issues
EVIDENCE_ID_GATE_MODE=blocking
```

**Success Metrics**:
- Patch suggestions >70% accurate
- Gate passes 95%+ of legitimate PRs
- Human validation time reduced by 50%+

## Ownership & SLAs

### Gate Owners
- **Primary**: Governance Team (`@governance-team`)
- **Secondary**: Platform Engineering (`@platform-eng`)
- **Tertiary**: Security (`@security-team`)

### Finding Triage Responsibilities
| Severity | Owner | SLA | Action |
|----------|-------|-----|--------|
| Critical | Governance Team | 4 hours | Immediate investigation |
| High | Document Owner | 24 hours | Priority fix |
| Medium | Governance Team | 1 week | Planned resolution |
| Low | Author | 1 month | Opportunistic fix |

### Hygiene Standards
- **Target**: <10% documents with Evidence ID violations
- **Goal**: <5% documents with Evidence ID violations
- **Baseline**: Current violation rate (established during Phase 1)

## Quality & UX Improvement Plan

### Metrics Collection
Add to gate execution:
- `evidence_id_gate_findings_accuracy` - Ratio of actionable to total findings
- `evidence_id_gate_patch_acceptance_rate` - % of AI patches accepted/used
- `evidence_id_gate_false_positive_rate` - % of erroneous findings

### Feedback Collection
Add mechanism to triage findings:
- `evidence-id-gate-feedback` GitHub form for false positive reporting
- Quarterly reviews of top issue patterns
- Prompt tuning based on feedback clusters

### Continuous Improvement
- Monthly prompt/schema reviews
- Bi-weekly policy updates aligned with new evidence types
- Performance optimization based on usage patterns

## Policy Evolution Framework

### Maturity Levels
- **Level 1 (Inform)**: Gate runs, findings reported but non-blocking
- **Level 2 (Advise)**: Gate reports with warnings, optional blocking
- **Level 3 (Enforce)**: Gate enforces compliance, mandatory fixes for PRs

### Evidence ID Lifecycle
- **Active**: Referenced by >=1 document
- **Deprecated**: Registry exists but no references, marked for removal
- **Stale**: No references for >90 days, automatic cleanup possible
- **Unregistered**: Referenced but not in registry, needs registration

### Periodic Reviews
- **Quarterly**: Policy and schema version updates
- **Bi-annual**: Evidence registry cleanup (orphaned IDs)
- **Annual**: Gate effectiveness assessment and roadmap planning

## Ecosystem Integration Strategy

### Integration Points

#### SOC Dashboard Integration
1. **Status API**: Add `GET /api/evidence-id-status` endpoint in compliance service
2. **Metrics**: Push gate result counts to SOC metrics backend
3. **Alerts**: Trigger SOC-001 alerts if hygiene drops below 85%

#### Release Evidence Packs
1. **Bundle inclusion**: Add evidence-id reports to SBOM and provenance packs
2. **Sign-off workflow**: Gate must pass before evidence pack signing
3. **Attestation**: Generate evidence-attestation files with SHA256 hashes

#### Governance Scorecards
1. **Hygiene scores**: Add Evidence ID consistency scores to team scorecards
2. **Trend analysis**: Track improvement over time for each repository
3. **Benchmarking**: Compare against other teams/segments

## Advanced Capabilities Roadmap

### Q2-Q3 2026: Cross-Artifact Consistency
- Link Evidence IDs across documentation, tests, controls, and runtime evidence
- Detect drift between policy and implementation artifacts
- Generate cross-repo integrity reports

### Q3-Q4 2026: Refactor Support
- Bulk Evidence ID renumbering with automated patch generation
- Preview mode for large-scale Evidence ID changes
- Impact analysis before Evidence ID deprecation

### Future Enhancements
- Real-time Evidence ID validation in IDEs/editors
- Slack notifications for new violations in PR reviews
- Integration with ticketing system for tracking remediation

## Rollback & Emergency Procedures

### Service Degradation
1. **Immediate**: Set `ENABLE_QWEN_ANALYSIS=false` in environment
2. **Short-term**: Remove from CI but keep available for manual runs
3. **Long-term**: Revert to v1.2.0 via version pinning

### Emergency Contacts
- **PagerDuty**: `evidence-id-gate-critical`
- **Slack escalation**: `@governance-oncall`
- **Rollback command**: `git checkout tags/v1.2.0 -- scripts/ci/verify_evidence_id_consistency.mjs`

## Success Measurement

### KPIs to Track
- **Adoption Rate**: % of repos with gate enabled
- **Performance**: Avg execution time and cache hit rates
- **Accuracy**: True positive vs false positive ratio
- **Efficiency**: Time saved in manual review processes
- **Coverage**: % of governance documents with proper Evidence IDs

### Goals
- **Month 3**: 25% of repos using gate in analysis mode
- **Month 6**: 50% of repos with AI patches enabled
- **Month 9**: 75% of repos with blocking enforcement
- **Year 1**: 90% governance document compliance

---

This rollout plan ensures controlled, measured adoption across the organization while maintaining operational excellence and governance compliance.