# Feature Discovery → GA Development Prompt (Summit Standard)

> **Operating Rule:** Never defend the past. Only assert the present and dictate the future.
> **Escalate before anyone asks:** reference the [Summit Readiness Assertion](SUMMIT_READINESS_ASSERTION.md).
> **Move the fight to paper:** cite files, not opinions.

## Objective
Identify an experimental, orphaned, or underdeveloped feature within **[PROJECT_NAME]** and advance
it to **GA** with production-quality engineering, full evidence, and enterprise-grade reliability.
Deliver a complete, production-grade package with architecture, implementation, testing,
documentation, CI/CD, and operational readiness artifacts.

## Execution Constraints
- **Evidence-first output:** deliver a Unified Evidence Format (UEF) bundle before any narrative.
- **Reversibility:** all decisions must include rollback triggers and steps.
- **Policy alignment:** do not bypass GA/Security/Evidence gates.
- **Boundaries:** respect module zone boundaries and avoid cross-zone coupling unless explicitly required.

## Phase 0 — Evidence Protocol (UEF)
Provide raw evidence before conclusions:
- File paths and line ranges
- Git history references (commit IDs)
- Test coverage artifacts
- Issue tracker links
- Feature flags/config toggles

## Phase 1 — Discovery & Assessment
**Task:** audit the repository for candidate features.

**Search Criteria**
1. Experimental: feature flags, beta/labs/preview tags
2. Orphaned: no commits in >6 months, missing ownership
3. Underdeveloped: missing tests, incomplete flows, absent docs

**Analysis Requirements**
- Find TODOs, feature flags, and experimental annotations
- Review git history for stale ownership
- Check test coverage gaps
- Review issue tracker for blocked/postponed requests
- Assess user feedback and telemetry

**Deliverable:** prioritized list including
- Feature name + file locations
- Completion estimate (%)
- Test coverage status
- Documentation status
- Business value estimate
- Technical debt score
- Effort estimate to GA

## Phase 2 — Selection & Planning
**Selection Criteria (1–10):**
- User demand / business value
- Technical feasibility
- Strategic alignment
- Risk of breaking changes
- Dependencies / blockers

**Planning Deliverables**
1. Technical Specification
   - Scope + requirements
   - Architecture + integration points
   - API contracts + data models
   - Security/compliance considerations
   - Performance targets + SLAs
2. Gap Analysis
   - Missing functionality
   - Test coverage gaps
   - Documentation gaps
   - Infra/monitoring gaps
3. Development Roadmap
   - Milestones + acceptance criteria
   - Timeline + resources
   - Risk mitigation plan
   - Rollback strategy

## Phase 3 — GA Implementation Standards
**Code Quality**
- Production-grade refactor
- Structured error handling
- Logging + instrumentation
- Performance profiling
- Security review

**Testing (target ≥80%)**
- Unit tests
- Integration tests
- End-to-end tests
- Regression suite
- Performance/load tests
- Security tests

**Documentation**
- API documentation
- User-facing documentation
- ADRs
- Runbooks
- Migration guide (if needed)

**Infrastructure & Operations**
- CI/CD integration
- Deployment automation
- Monitoring + alerting
- SLO/SLA definitions
- Rollback procedures
- Feature-flag rollout strategy

## Phase 4 — Pre-GA Validation
**Beta Program**
- Define cohort
- Feedback collection
- Exit criteria
- Canary rollout

**GA Readiness Checklist**
- Acceptance criteria met
- Test coverage achieved
- Documentation complete
- Performance benchmarks validated
- Security audit passed
- Support and incident response ready
- Stakeholder sign-off

## Phase 5 — Launch & Post-GA
**Launch**
- Production deploy
- Release notes
- User communications
- Monitor key metrics

**Post-Launch (30 days)**
- Daily monitoring
- Weekly retrospectives
- Bug triage + hotfixes
- Optimization backlog

## MAESTRO Threat Model Alignment
When proposing changes, explicitly state:
- **MAESTRO Layers:** [Foundation, Data, Agents, Tools, Infra, Observability, Security]
- **Threats Considered:** [goal manipulation, prompt injection, tool abuse, data exfiltration]
- **Mitigations:** [policy gates, input validation, least-privilege, audit logging]

## Success Metrics (KPI Examples)
- Adoption rate
- Latency/throughput
- Error rate + incident count
- User satisfaction
- Business impact

## Output Format (Strict)
1. **High-Level Summary + 7th-Order Implications**
2. **Full Architecture** (diagrams + integration map)
3. **Implementation** (all files, no placeholders)
4. **Tests** (unit, integration, e2e, performance, security)
5. **Documentation** (README, dev guide, ops guide, API docs)
6. **CI/CD** (pipelines, quality gates, evidence artifacts)
7. **PR Package** (commit history summary, PR description, reviewer checklist)
8. **Future Roadmap** (post-GA enhancements)
9. **UEF Evidence Bundle**
10. **Final GA Checklist**

## PR Package Requirements
- **Commit history:** list commits with intent and scope.
- **PR description:** what, why, how, risks, rollback plan.
- **Reviewer checklist:** tests, security, compliance, docs.
- **Merge readiness:** evidence links, SLO impact, approval needs.
- **Post-merge validation:** monitoring plan + success metrics.

## Forward-Leaning Enhancement
Introduce a **GA Readiness Scorecard** in CI that blocks merge unless evidence, tests, and docs meet
GA thresholds.

## Example Invocation
```
Use this prompt to identify and GA-ify any suitable feature in [REPOSITORY_NAME].
Start with Phase 1 discovery and return a prioritized list.
Then select one feature and produce the full GA plan.

Repository: [path or URL]
Timeline: [X weeks]
Priority Constraints: [e.g., security-critical, user-facing]
```
