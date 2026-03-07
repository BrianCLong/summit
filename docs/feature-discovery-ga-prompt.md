# Feature Discovery → GA Development Prompt (Summit Standard)

> **Operating Rule:** Never defend the past. Only assert the present and dictate the future.
> **Escalate before anyone asks:** reference the [Summit Readiness Assertion](SUMMIT_READINESS_ASSERTION.md).
> **Move the fight to paper:** cite files, not opinions.

## Mission
Identify an experimental, orphaned, or underdeveloped feature within **[PROJECT_NAME]** and advance
it to **GA** with production-quality engineering, full evidence, and enterprise-grade reliability.
Deliver a complete production package: architecture, implementation, tests, documentation, CI/CD,
security posture, observability, and a merge-ready PR package.

## Inputs Required (Do Not Start Without)
- Repository path / URL
- Target timeline
- Change class (`patch`, `minor`, `major`)
- Priority axis (user impact, security, reliability, or platform efficiency)
- Explicit non-goals

## Execution Constraints
- **Evidence-first output:** publish UEF before narrative conclusions.
- **Reversibility:** every decision has rollback trigger + steps.
- **Policy alignment:** no bypass of GA/Security/Evidence gates.
- **Boundary discipline:** one primary zone per change unless explicitly coupled.
- **Golden main readiness:** every milestone must be merge-safe and CI-clean.

## Phase 0 — UEF Evidence Protocol (Mandatory)
Provide raw evidence before conclusions:
- File paths + line ranges
- Git history references (commit IDs)
- Coverage artifacts and test evidence
- Issue tracker links
- Feature flags / configuration toggles
- Risk register + mitigation mapping

## Phase 1 — Discovery & Assessment
**Task:** audit the repository for candidate features.

**Search Criteria**
1. Experimental: feature flags, beta/labs/preview tags
2. Orphaned: no commits in >6 months, missing ownership
3. Underdeveloped: missing tests, incomplete flows, absent docs

**Analysis Requirements**
- Locate TODOs, feature flags, and experimental annotations
- Review git history for stale ownership and abandoned branches
- Check test coverage gaps
- Review issue tracker for blocked/postponed requests
- Assess user feedback and telemetry signals

**Deliverable:** prioritized candidates with
- Feature name + file locations
- Completion estimate (%)
- Test coverage status
- Documentation status
- Business value estimate
- Technical debt score
- Effort estimate to GA

## Phase 2 — Selection & Planning
**Selection Criteria (1–10 weighted):**
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
   - Timeline + resource profile
   - Risk mitigation plan
   - Rollback strategy

## Phase 3 — GA Implementation Standards
**Code Quality**
- Production-grade refactor
- Typed error handling and edge-case coverage
- Logging + instrumentation
- Performance profiling
- Security review

**Testing (target ≥80% for changed surfaces)**
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
- Feedback collection loop
- Exit criteria
- Canary rollout model

**GA Readiness Checklist**
- Acceptance criteria met
- Test coverage achieved
- Documentation complete
- Performance benchmarks validated
- Security audit passed
- Support + incident response ready
- Stakeholder sign-off complete

## Phase 5 — Launch & Post-GA
**Launch**
- Production deployment
- Release notes
- User communication
- Real-time KPI monitoring

**Post-Launch (30 days)**
- Daily monitoring
- Weekly retrospectives
- Bug triage + hotfix path
- Optimization backlog

## MAESTRO Threat Model Alignment
For every proposed change, explicitly state:
- **MAESTRO Layers:** [Foundation, Data, Agents, Tools, Infra, Observability, Security]
- **Threats Considered:** [goal manipulation, prompt injection, tool abuse, data exfiltration]
- **Mitigations:** [policy gates, input validation, least-privilege, audit logging]

## Summit Verification Command Pack
Run and report pass/fail for the applicable set:
- `node scripts/check-boundaries.cjs`
- `pnpm lint`
- `pnpm format:check`
- `pnpm typecheck`
- `pnpm test`
- `make smoke`

If constraints prevent full execution, mark each constrained command as
**Intentionally constrained** with reason and next runnable environment.

## Required Artifacts (Per Change)
- `decision-rationale.md` (why now, confidence 0–1, alternatives)
- `rollback-plan.md` (trigger thresholds + exact actions)
- `test-plan.md` (tiers, commands, expected evidence)
- `release-notes.md` (customer-facing and operator-facing)
- `risk-register.md` (risk, likelihood, impact, mitigation, owner)

## Output Format (Strict)
1. **High-Level Summary + 7th+ Order Implications**
2. **Full Architecture** (diagrams + integration map)
3. **Implementation** (all files, no placeholders)
4. **Tests** (unit, integration, e2e, performance, security)
5. **Documentation** (README, dev guide, ops guide, API docs)
6. **CI/CD** (pipelines, quality gates, evidence artifacts)
7. **PR Package** (commit history, PR body, reviewer checklist)
8. **Future Roadmap** (post-GA enhancements)
9. **UEF Evidence Bundle**
10. **Final GA Checklist**

## PR Package Requirements
- **Commit history:** commits listed with intent and scope.
- **PR description:** what, why, how, risk, rollback, accountability window.
- **Reviewer checklist:** tests, security, compliance, docs, rollout safety.
- **Merge readiness summary:** gate status + evidence links + residual risk.
- **Post-merge validation plan:** metrics, thresholds, owners, response timing.

## Forward-Leaning Enhancement
Implement a **GA Readiness Scorecard** in CI that blocks merge unless evidence,
tests, docs, and rollback criteria meet minimum thresholds.

## Example Invocation
```text
Use this prompt to identify and GA-ify any suitable feature in [REPOSITORY_NAME].
Start with Phase 1 discovery and return a prioritized list.
Then select one feature and produce the full GA plan.

Repository: [path or URL]
Timeline: [X weeks]
Change class: [patch|minor|major]
Priority Constraints: [security-critical | user-facing | reliability-first]
Non-goals: [explicit exclusions]
```
