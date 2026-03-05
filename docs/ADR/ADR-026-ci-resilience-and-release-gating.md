# ADR-026: CI Resilience and Multi-Signal Release Gating

**Status:** Accepted
**Date:** 2026-02-28
**Authors:** Brian Long, Engineering Team
**Decision:** Implement evidence-based release gates that don't depend on single vendor signals

---

## Context

On 2026-02-27 to 2026-02-28, we encountered a situation where:

1. **Problem:** golden-main GA verification workflow was blocked for 3+ hours due to GitHub Actions platform saturation (1,000+ queued runs, shared-runner exhaustion)
2. **Impact:** Traditional "wait for green check" approach would have delayed GA by unknown timeline (hours to days)
3. **Discovery:** Main branch was actually healthy (all blockers remediated), but we couldn't obtain traditional CI signal

This revealed a **critical vulnerability**: Our release gating was entirely dependent on a single vendor's (GitHub Actions) infrastructure availability.

### Why This Matters for Summit

Our target customers (government, defense, regulated industries) **require operational resilience** even when third-party infrastructure degrades. If we can't ship under degraded conditions with proper governance, we can't credibly sell to these customers.

### The Traditional Approach (Inadequate)

Most organizations handle CI vendor outages by:
1. **Wait it out** - Delay release until vendor recovers (opportunity cost, unpredictable timeline)
2. **Ship anyway** - Bypass checks entirely (governance risk, no audit trail)
3. **Manual testing** - Ad-hoc verification without documentation (not reproducible, not scalable)

None of these approaches demonstrate **enterprise-grade operational maturity**.

---

## Decision

We adopt a **multi-signal release gate framework** that:

1. **Primary Signal (Preferred):** Automated CI workflow (golden-main) completes successfully
2. **Evidence-Based Signal (Fallback):** Audit-grade documentation of remediation + risk mitigation when automation is blocked by external factors
3. **Never:** Ship without either primary OR evidence-based signal

### Core Principles

**Principle 1: Vendor Outages Must Not Block Business Continuity**
- External infrastructure failure is a risk we accept and plan for
- Having a documented fallback path is **more mature** than having perfect uptime

**Principle 2: Governance is Mandatory, Automation is Optional**
- Automated checks are preferred (faster, cheaper, more reliable)
- But when automation fails, manual verification with audit trails is acceptable
- What's **never** acceptable: Shipping without any verification

**Principle 3: Evidence-Based Releases Require Higher Approval Authority**
- Automated release (golden-main passes): Engineering Lead approval
- Evidence-based release (manual verification): Engineering Lead + Product Owner approval
- This balances agility with risk management

---

## Evidence-Based Release Gate Requirements

When the automated CI signal (golden-main) is unavailable due to **external factors** (vendor outage, platform capacity, etc.), we can proceed with GA using evidence-based verification if ALL of the following criteria are met:

### 1. Root Cause Analysis (Mandatory)

Document:
- What blocked the automated CI signal?
- Is the blocker in our control (code issue) or external (vendor infrastructure)?
- What evidence proves this attribution?

**Acceptance Criteria:**
- ✅ Root cause identified with external evidence (vendor status page, community reports, etc.)
- ✅ Clear separation between "code issues" and "platform issues"
- ✅ Timeline of events documented

**If root cause is internal** (our code or config) → **BLOCK RELEASE** until fixed

### 2. Remediation Evidence (Mandatory)

Document:
- What was broken / what blocked previous successful runs?
- What specific actions were taken to remediate?
- What evidence proves remediation was successful?

**Acceptance Criteria:**
- ✅ PRs merged with documented changes
- ✅ Commit SHAs and git clean state verified
- ✅ Configuration files validated (linting, parsing, etc.)
- ✅ Workflow files syntactically correct

### 3. Forward-Looking Confidence Case (Mandatory)

Explain:
- Why is the code ready despite lack of recent green CI runs?
- What alternative signals give us confidence?
- What historical baseline exists (last known good state)?

**Acceptance Criteria:**
- ✅ Code changes minimal and well-understood (not large refactor)
- ✅ CI configuration validated (workflows parse and trigger correctly)
- ✅ Historical baseline identified (last successful run, or pre-corruption state)

### 4. Risk Assessment & Mitigation (Mandatory)

Document:
- What could go wrong?
- What is likelihood and impact of each risk?
- What mitigations are in place?

**Minimum Mitigations Required:**
- ✅ Canary deployment (5-25% of users first, with soak period)
- ✅ Fast-revert procedure documented and tested
- ✅ Enhanced monitoring for first 24-48 hours
- ✅ On-call rotation with defined escalation

### 5. Audit-Grade Artifacts (Mandatory)

Produce:
- Comprehensive evidence document (>5 pages)
- Stakeholder-facing summary
- Approval signatures from required authorities

**Acceptance Criteria:**
- ✅ Evidence document includes: root cause, remediation, confidence case, risk assessment
- ✅ All claims backed by verifiable artifacts (commit SHAs, run IDs, timestamps)
- ✅ Approval authority documented (who approved, when, based on what evidence)

### 6. Approval Authority (Mandatory)

**Required Approvals:**
- Engineering Lead (technical risk assessment)
- Product Owner (business value vs. risk trade-off)

**Optional Escalation:**
- CEO/CTO (if risk is rated "High" or "Critical")
- Legal/Compliance (if regulatory implications)

---

## Implementation

### Phase 1: Immediate (GA Release)

**Status:** ✅ Complete (implemented 2026-02-27 to 2026-02-28)

- [x] Create evidence-based release gate template
- [x] Document tonight's GA decision as reference example
- [x] Build automated monitoring for blocked CI workflows
- [x] Create stakeholder communication templates

**Artifacts Created:**
- `/tmp/ga-readiness-evidence.md` (12-page audit-grade evidence doc)
- `/tmp/ga-approval-request.md` (formal approval template)
- `/tmp/monitor-golden-main.sh` (automated CI monitoring)
- `/tmp/check-golden-main-status.sh` (quick status check)

### Phase 2: Short-Term (Next 30 Days)

**Objective:** Make evidence-based releases reproducible (not one-off)

- [ ] Formalize evidence-based release template (this ADR)
- [ ] Add to engineering playbook / runbook
- [ ] Train engineering team on decision framework
- [ ] Create approval workflow (GitHub issue template + required reviewers)

**Deliverables:**
- ADR published to `docs/adr/001-ci-resilience.md`
- Playbook section: "How to Execute Evidence-Based Release"
- Training session recording for future team members

### Phase 3: Medium-Term (Next 90 Days)

**Objective:** Reduce dependency on single CI vendor

- [ ] Deploy self-hosted runner for golden-main workflow
- [ ] Implement multi-cloud CI strategy (GitHub Actions + GitLab CI)
- [ ] Add concurrency controls to reduce queue pressure
- [ ] Consolidate workflows (50 → 10-15 critical paths)

**Success Metrics:**
- golden-main execution time: <15 minutes (from 3+ hours)
- CI vendor as single point of failure: Eliminated
- Workflow count: <15 (from 50)

### Phase 4: Long-Term (Next 6 Months)

**Objective:** Build CI resilience into product for customers

- [ ] Publish CI resilience framework as public documentation
- [ ] Offer "evidence-based deployment" option for customer air-gap environments
- [ ] Build observability dashboards for CI health metrics
- [ ] Contribute lessons learned to open-source CI/CD community

**Strategic Value:**
- Differentiation: "We ship reliably even under degraded conditions"
- Customer trust: "They practice what they preach (governance-first)"
- Recruiting: "Mature engineering culture, not cowboy coding"

---

## Consequences

### Positive

1. **Business Continuity:** Vendor outages no longer block release authority
2. **Operational Maturity:** Demonstrates governance-first culture to customers
3. **Reusable IP:** Framework applies to customer deployments (air-gap, self-hosted)
4. **Recruiting Signal:** Thoughtful engineering culture attracts senior talent
5. **Investor Confidence:** Evidence of mature decision-making under pressure

### Negative

1. **Higher Overhead:** Evidence-based releases take longer (documentation burden)
2. **Approval Bottleneck:** Requires both Engineering Lead + Product Owner (vs. just eng lead for automated)
3. **Potential for Abuse:** Team might use evidence-based path to bypass legitimate CI failures
4. **Documentation Debt:** If not maintained, templates become stale

### Mitigation of Negative Consequences

**For "Higher Overhead":**
- Templates and automation reduce documentation burden
- This is a **feature, not a bug** - we WANT higher bar for manual releases

**For "Approval Bottleneck":**
- Define SLA for approval requests (4-hour response time during business hours)
- Allow async approval via documented sign-off (don't require synchronous meeting)

**For "Potential for Abuse":**
- Strict requirement: Root cause MUST be external (vendor issue)
- If root cause is internal (our code/config) → evidence-based path is **blocked**
- Quarterly audit of all evidence-based releases (are we abusing the escape hatch?)

**For "Documentation Debt":**
- Add to quarterly engineering review: "Are evidence-based release templates current?"
- Version control all templates (detect staleness via git blame)

---

## Comparison to Alternatives

### Alternative 1: Wait for Vendor Recovery (Status Quo)

**Approach:** Block all releases until GitHub Actions recovers

**Pros:**
- Simple (no new process)
- No risk of shipping bad code if CI is actually failing

**Cons:**
- Unpredictable timelines (could be days)
- Loss of release authority (vendor controls our GA schedule)
- Opportunity cost (delay to market, competitor advantage)

**Why Rejected:** Unacceptable for enterprise customers who require operational resilience

---

### Alternative 2: Ship Without Verification

**Approach:** Bypass CI checks entirely when blocked, ship and hope

**Pros:**
- Fast (no delays)
- Simple (no documentation)

**Cons:**
- High risk (could ship broken code)
- No audit trail (can't defend decision to auditors)
- Precedent problem (team learns "checks are optional")

**Why Rejected:** Violates governance principles, unacceptable risk

---

### Alternative 3: Full Multi-Cloud CI (Day 1)

**Approach:** Run identical CI pipelines on GitHub Actions + GitLab CI + CircleCI, require 2/3 to pass

**Pros:**
- True resilience (no single vendor dependency)
- Automated (no manual evidence gathering)

**Cons:**
- Expensive (3x CI cost)
- Complex (maintain 3 identical pipelines)
- Overhead (not needed for most releases)

**Why Rejected:** Over-engineering for current scale. Self-hosted runner for golden-main only is sufficient.

---

### Alternative 4: Local CI Execution

**Approach:** Run all CI checks locally using `act` (GitHub Actions simulator) or Docker Compose

**Pros:**
- No vendor dependency
- Fast feedback loop

**Cons:**
- Doesn't prove "works in production CI environment"
- No audit trail (local execution not logged)
- Difficult to replicate exact GitHub Actions environment

**Why Rejected:** Useful for development, but not sufficient for GA gate. Complement, not replacement.

---

## Success Metrics

### Leading Indicators (Process Compliance)

- **Evidence-based releases:** <20% of total releases (most should use automated path)
- **Approval turnaround time:** <4 hours from request to approval
- **Documentation completeness:** 100% of evidence-based releases have all required sections

### Lagging Indicators (Business Outcomes)

- **Release velocity maintained:** GA schedule not delayed by vendor outages
- **Production incidents:** No increase in post-GA incident rate despite evidence-based path
- **Customer trust:** GA readiness framework cited in 3+ sales cycles as competitive advantage

### Red Flags (Indicates Process Abuse)

- **Evidence-based release frequency >50%:** Suggests automated CI is chronically broken (our fault, not vendor)
- **Root cause attribution fuzzy:** Evidence docs blame "vendor" without external proof
- **Approval rubber-stamping:** <2 hours from evidence doc creation to approval (suggests not thorough review)

---

## Related Decisions

**Future ADRs:**
- ADR-002: Self-Hosted Runner Strategy (to reduce primary signal dependency on GitHub)
- ADR-003: Workflow Consolidation Plan (50 → 15 workflows)
- ADR-004: Multi-Signal Release Gates for Customer Deployments

---

## References

### Internal Documents

- `/tmp/ga-readiness-evidence.md` - Complete evidence package from 2026-02-28 GA
- `/tmp/ga-approval-request.md` - Approval request template
- `/tmp/ga-morning-playbook.md` - Operational procedures for degraded CI
- `/tmp/monitor-golden-main.sh` - Automated monitoring implementation

### External References

- [GitHub Actions Runner Availability Issues](https://github.com/orgs/community/discussions/163115)
- [Evidence-Based Software Engineering](https://www.microsoft.com/en-us/research/publication/evidence-based-software-engineering/)
- [Google SRE Book: Release Engineering](https://sre.google/sre-book/release-engineering/)
- [NIST SP 800-218: Secure Software Development Framework](https://csrc.nist.gov/publications/detail/sp/800-218/final)

---

## Review and Maintenance

**Review Schedule:** Quarterly
**Next Review:** 2026-05-31
**Owner:** Engineering Lead
**Stakeholders:** Product Owner, CTO

**Review Checklist:**
- [ ] Are evidence-based release metrics within acceptable ranges?
- [ ] Have we had any incidents due to evidence-based releases?
- [ ] Are templates still current and complete?
- [ ] Has team training been completed for new hires?
- [ ] Do we need to adjust approval authority levels?

---

## Appendix A: Example Evidence-Based Release Checklist

```markdown
# Evidence-Based Release Checklist

## Pre-Requisites
- [ ] Automated CI signal (golden-main) is blocked OR has exceeded timeout threshold (>3 hours)
- [ ] Root cause is EXTERNAL (vendor outage, not our code issue)
- [ ] External evidence collected (vendor status page, community reports, timestamps)

## Documentation Required
- [ ] Root cause analysis (1-2 pages)
- [ ] Remediation evidence (PRs merged, commit SHAs, git status clean)
- [ ] Forward-looking confidence case (why code is ready despite lack of CI signal)
- [ ] Risk assessment (likelihood × impact for top 3-5 risks)
- [ ] Mitigation plan (canary deployment, monitoring, rollback procedure)
- [ ] Audit-grade artifacts (timeline, approvals, references)

## Approvals Required
- [ ] Engineering Lead reviewed and approved (technical risk assessment)
- [ ] Product Owner reviewed and approved (business value vs. risk trade-off)
- [ ] (Optional) CTO/CEO if risk rated "High" or "Critical"

## Risk Mitigations Implemented
- [ ] Canary deployment configured (5-25% initial rollout)
- [ ] Fast-revert procedure documented and tested (<5 min execution)
- [ ] Enhanced monitoring enabled (first 24-48 hours)
- [ ] On-call rotation scheduled with escalation path
- [ ] Stakeholder communication drafted (internal + external)

## Post-Release
- [ ] Monitor canary metrics (error rate, latency, user feedback)
- [ ] Gradual rollout (5% → 25% → 50% → 100% over 24-48 hours)
- [ ] Retrospective scheduled (what went well, what to improve)
- [ ] ADR updated if lessons learned suggest process changes
```

---

## Appendix B: Root Cause Attribution Criteria

**How to determine if blocker is EXTERNAL (evidence-based path allowed) vs. INTERNAL (BLOCK release):**

### ✅ EXTERNAL (Evidence-Based Path Allowed)

**Vendor Infrastructure Issues:**
- GitHub Actions runner saturation (queue >500 runs, >2 hour wait times)
- Cloud provider outage (AWS, GCP, Azure region down)
- Third-party API degradation (Anthropic API, Neo4j Cloud)

**Evidence Required:**
- Vendor status page showing incident
- Community reports (GitHub discussions, Reddit, Twitter)
- Timestamps showing problem persists across multiple retry attempts
- Our infrastructure metrics show normal operation

**Example:** golden-main queued 3+ hours while GitHub Actions shows 1,000+ queue depth

---

### ❌ INTERNAL (BLOCK Release, Fix Required)

**Code Issues:**
- Test failures (legitimate bugs found by CI)
- Build failures (compilation errors, missing dependencies)
- Security scan failures (vulnerabilities detected)
- Policy violations (OPA/Kyverno rules failed)

**Configuration Issues:**
- Workflow syntax errors (YAML parsing failures)
- Invalid secrets/credentials
- Incorrect environment variables
- Missing required files

**Evidence:**
- CI logs show actual failures (not timeouts or "no runner available")
- Failures are deterministic (reproduce locally)
- No corresponding vendor status page incidents

**Action:** FIX THE ISSUE, do not use evidence-based escape hatch

---

## Appendix C: Governance Decision Tree

```
┌─────────────────────────────────────┐
│ golden-main CI workflow triggered   │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌──────────────┐
        │ Completed?   │
        └──┬────────┬──┘
           │        │
          YES      NO
           │        │
           │        ▼
           │   ┌────────────────┐
           │   │ Queued >3hrs?  │
           │   └──┬──────────┬──┘
           │      │          │
           │     YES        NO
           │      │          │
           │      │          ▼
           │      │   ┌─────────────────┐
           │      │   │ Continue waiting│
           │      │   │ Check in 30 min │
           │      │   └─────────────────┘
           │      │
           │      ▼
           │   ┌──────────────────────────┐
           │   │ Is blocker EXTERNAL?     │
           │   │ (vendor outage, not our  │
           │   │  code/config issue?)     │
           │   └──┬────────────────────┬──┘
           │      │                    │
           │     YES                  NO
           │      │                    │
           │      │                    ▼
           │      │             ┌─────────────┐
           │      │             │ FIX ISSUE   │
           │      │             │ BLOCK RELEASE│
           │      │             └─────────────┘
           │      │
           │      ▼
           │   ┌──────────────────────────────┐
           │   │ Build Evidence Package:       │
           │   │ - Root cause analysis         │
           │   │ - Remediation evidence        │
           │   │ - Risk assessment             │
           │   │ - Mitigation plan             │
           │   └──────────┬───────────────────┘
           │              │
           │              ▼
           │   ┌──────────────────────────────┐
           │   │ Get Approvals:                │
           │   │ - Engineering Lead            │
           │   │ - Product Owner               │
           │   └──────────┬───────────────────┘
           │              │
           │              ▼
           ▼              ▼
   ┌───────────────────────────┐
   │ Conclusion = SUCCESS?     │
   └──┬────────────────────┬───┘
      │                    │
     YES                  NO
      │                    │
      ▼                    ▼
   ┌────────────┐   ┌──────────────┐
   │ SHIP       │   │ TRIAGE &     │
   │ (canary +  │   │ FIX          │
   │  monitoring│   │ BLOCK RELEASE│
   └────────────┘   └──────────────┘
```

---

**This ADR establishes Summit's evidence-based release framework as organizational knowledge, ensuring we can maintain operational resilience even when external dependencies fail.**

**Status:** ✅ Accepted and implemented (2026-02-28)
**Next Review:** 2026-05-31
