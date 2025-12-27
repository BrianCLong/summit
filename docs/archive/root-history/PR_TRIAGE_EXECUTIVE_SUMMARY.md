# PR Triage Executive Summary

**Date:** November 20, 2025
**Repository:** BrianCLong/summit
**Current State:** 428 Open PRs
**Target State:** <100 Open PRs
**Timeline:** 5 weeks
**Confidence:** High

---

## The Problem

Summit has accumulated **428 open pull requests**, with the oldest dating back 2-3 months. This creates:
- **Review bottleneck** - valuable contributions stuck in queue
- **Merge conflicts** - PRs become stale and harder to merge
- **Lost context** - original authors may have moved on
- **Quality risk** - rushed reviews to clear backlog
- **Team morale impact** - contributors feel ignored

### Root Causes

1. **AI/Bot Generation at Scale** - 57-74% of PRs are AI/bot-generated
   - September 2025: 200-250 PRs created in 4 days ("codex" batch)
   - November 2025: ~50 bot PRs (google-labs-jules)
   - Lack of human review gate before PR creation

2. **Review Capacity Insufficient** - Not enough reviewers for volume
   - 428 PRs / limited reviewers = unsustainable ratio
   - No clear ownership or triage process

3. **Lack of PR Lifecycle Management** - No aging/staleness policy
   - PRs sit indefinitely without closure or escalation
   - No automated reminders or stale bot

4. **CI/CD Issues** - Many PRs blocked by infrastructure problems
   - Deployment failures
   - Flaky tests
   - Long CI run times (150+ checks taking hours)

---

## The Solution: 5-Phase Plan

### Phase 1: Immediate Actions (Week 1) → 378 PRs (-50)

**Quick wins to build momentum:**
- Close 8 duplicate PRs
- Close 2-4 security-vulnerable PRs
- Close 20-30 stale PRs with merge conflicts
- Merge 10-15 low-risk quick wins

**Effort:** 5-8 hours
**Risk:** Low

### Phase 2: September Batch Systematic Review (Weeks 2-3) → 228 PRs (-150)

**Tackle the largest concentration (200-250 PRs from Sep 24-27):**
- Categorize all September PRs (merge candidates, needs fixes, close, undecided)
- Close "won't merge" and "superseded" (70-110 PRs)
- Merge candidates (30-50 PRs)
- Create issues for "needs fixes" category

**Effort:** 20-30 hours (distributed across team)
**Risk:** Medium (requires careful categorization)

### Phase 3: Recent PRs and Bot Fixes (Week 4) → 148 PRs (-80)

**Address recent high-value PRs:**
- Fix 4 critical bot PRs (#11985, #11977, #11886, #11887)
- Split bloated #10079 into focused PRs
- Triage intelligence platform series (~30 PRs, close 15-20)
- Review October PRs (merge 15-20, close 15-20)

**Effort:** 15-20 hours
**Risk:** Medium (requires technical fixes)

### Phase 4: Sustainable State (Week 5) → <100 PRs (-48)

**Establish long-term health:**
- Implement PR aging policy (90-day auto-close)
- Improve bot PR process (draft by default, human gate)
- Batch remaining PRs by theme, assign to teams
- Set up PR health dashboard

**Effort:** 10-15 hours + policy documentation
**Risk:** Low

### Phase 5: Maintenance Mode (Ongoing)

**Keep it healthy:**
- Weekly triage meetings (30 min)
- Monitor PR health metrics
- Maintain <100 open PRs
- Prevent future backlog

**Effort:** 2-3 hours/week ongoing
**Risk:** Low

---

## Key Findings from Analysis

### By the Numbers

| Metric | Value |
|--------|-------|
| **Total Open PRs** | 428 |
| **AI/Bot-Generated** | 57-74% (~245-315 PRs) |
| **September "Codex" Batch** | 200-250 PRs (47-58%) |
| **Bot PRs (google-labs-jules)** | 40-50 PRs (9-12%) |
| **Claude-Generated** | 5-15 PRs (1-4%) |
| **Exact Duplicates Found** | 8 PRs (4 pairs) |
| **PRs >60 Days Old** | ~250 PRs |
| **PRs with Merge Conflicts** | ~50-70 PRs (estimated) |

### Duplicate PRs Identified

| PR Pair | Issue | Recommendation |
|---------|-------|----------------|
| #1419, #1435 | Broken pnpm-lock.yaml | Close both |
| #1422, #1423 | Hardcoded credentials | Close both |
| #1697, #1698 | Consent reconciler | Close #1697, keep #1698 |
| #1425, #1436 | AutoML pipeline | Close #1436, keep #1425 |
| #1433, #1434 | Documentation | Close #1434, keep #1433 |
| #1418, #1432 | Edge export pipeline | Close #1418, keep #1432 |

### Critical Issues Discovered

**Security Vulnerabilities:**
- #1400: Hardcoded credentials + merge conflicts
- #1422, #1423: Hardcoded secrets in documentation
- #1500: Passwords logged in cleartext
- #1620: Authorization bypass vulnerability (tenant ID overwrite) - **P0**

**Architectural/Technical Blockers:**
- #11985: Elasticsearch API bug (v9 incompatibility)
- #11977: Prometheus metrics not registered
- #11886: Missing rate limiting on auth routes
- #10079: Massive scope creep (claims 3 fixes, actually 16 commits with 7,000+ lines)

**Patterns in September Batch (sample of 12 PRs):**
- 25% (3/12) have critical security/auth issues
- 33% (4/12) have blocking bugs
- 17% (2/12) are merge candidates
- 8% (1/12) already merged with unresolved issues

---

## Related PR Groups for Efficient Review

### Group A: Authentication & Authorization (6 PRs)
`#11887, #11886, #11860, #11831, #11826, #11825`
**Strategy:** Review foundational → specific

### Group B: Observability & SRE (5 PRs)
`#11915, #11912, #11857, #11856, #9800`
**Strategy:** Merge policy first (#11856), then others

### Group C: ML/AI Operations (4 PRs)
`#11968, #11941, #10154, #10091`
**Strategy:** Establish architectural direction first

### Group D: Search & Analytics (2 PRs)
`#11985, #11885`
**Strategy:** Fix #11985 bug, review together

### Group H: Testing & Quality (4 PRs) - **QUICK MERGE**
`#11971, #11865, #11864, #11824`
**Strategy:** These are valuable tests, low risk, merge immediately

---

## Risk Assessment

### Low Risk (Weeks 1, 4, 5)
- Closing duplicates and stale PRs
- Merging test coverage
- Policy establishment
- Documentation PRs

### Medium Risk (Weeks 2-3)
- September batch review (requires careful categorization)
- Technical fixes for bot PRs
- Batch merging related PRs

### High Risk Areas Requiring Extra Scrutiny
1. Authorization/Security PRs → Security team sign-off required
2. Database migration PRs → Test in staging first
3. API contract changes → Check client compatibility
4. ML model changes → Require evaluation metrics
5. Infrastructure changes → Need rollback plan

### Mitigation Strategy
- All merges must have rollback plan
- Monitor error rates for 24h post-merge
- Security PRs get dedicated security review
- High-risk PRs merged during business hours only

---

## PRs Blocked by CI/CD (Jules' Fixes)

**~50-100 PRs** show "deployment failed" status.

**Common Issues:**
- Docker build failures
- Kubernetes deployment timeouts
- Test environment connectivity issues
- Secret/config loading errors

**Action After Jules' Fixes Land:**
1. Re-trigger CI/CD for affected PRs
2. Identify PRs that now pass
3. Fast-track review for newly-passing PRs
4. Estimate: 20-30 PRs will unblock

---

## Resource Requirements

### Time Investment

| Phase | Duration | Team Effort | Lead Effort |
|-------|----------|-------------|-------------|
| Phase 1 | Week 1 | 5-8 hours | 3-4 hours |
| Phase 2 | Weeks 2-3 | 20-30 hours | 10-15 hours |
| Phase 3 | Week 4 | 15-20 hours | 8-10 hours |
| Phase 4 | Week 5 | 10-15 hours | 5-8 hours |
| **Total** | **5 weeks** | **50-73 hours** | **26-37 hours** |
| Phase 5 | Ongoing | 2-3 hours/week | 1-2 hours/week |

**Team Effort** = Distributed across reviewers
**Lead Effort** = Triage coordination, categorization, tooling

### People Needed

- **Triage Lead** (1 person, 50% time for 5 weeks)
- **Code Reviewers** (3-5 people, 5-10 hours/week)
- **Security Reviewer** (1 person, as-needed for security PRs)
- **Bot/AI Fixes** (1 engineer, ~8 hours for technical fixes)

---

## Success Metrics

### Quantitative

| Metric | Current | Week 1 | Week 3 | Week 5 | Target |
|--------|---------|--------|--------|--------|--------|
| Open PRs | 428 | 378 | 228 | 148 | <100 |
| PRs >60 days | ~250 | ~200 | ~50 | 0 | 0 |
| Duplicate PRs | 8 | 0 | 0 | 0 | 0 |
| Security-blocked | ~15 | ~10 | ~5 | 0 | 0 |
| Draft PRs >30d | ~10 | ~5 | 0 | 0 | 0 |

### Qualitative

- ✅ Team understands PR lifecycle policy
- ✅ Bot PR process has human review gate
- ✅ PR health dashboard operational
- ✅ Weekly triage meetings established
- ✅ Code review capacity increased
- ✅ CI/CD pipeline stable

---

## Quick Start (Week 1 Actions)

### Day 1 (30 min)
```bash
# Close 8 duplicate PRs
gh pr close 1419 1435 1422 1423 1697 1436 1434 1418 \
  --comment "..." # See PR_TRIAGE_QUICK_START.md for specific messages
```

### Day 2 (15 min)
```bash
# Close 2 security-vulnerable PRs
gh pr close 1400 1500 --comment "..."
```

### Day 3 (1-2 hours)
```bash
# Identify and close 20-30 stale PRs with conflicts
# See PR_TRIAGE_QUICK_START.md for detailed script
```

### Days 4-5 (2-3 hours)
```bash
# Merge 10-15 quick wins
# Focus on: tests, docs, low-risk features
```

**Week 1 Result: 428 → 378 open PRs (12% reduction)**

---

## Decision Points

### Go/No-Go Decision After Week 1

**Review criteria:**
- Did we hit 378 or fewer PRs?
- Was team effort within 5-8 hour estimate?
- Any unexpected blockers discovered?

**If No:** Adjust timeline or scope for Phases 2-3

### Checkpoint After Week 3

**Review criteria:**
- Are we at ~228 PRs or better?
- Is September batch review proceeding smoothly?
- Do we need additional review capacity?

**If No:** Consider extending timeline or adding reviewers

---

## Communication Plan

### Stakeholder Updates

**Weekly:**
- PR count progress report
- Closed/merged highlights
- Blockers/issues

**Bi-weekly:**
- Full metrics dashboard
- Process improvements
- Team feedback

### Community Communication

**Announcement:**
- Post in engineering Slack channel
- Explain triage process and timeline
- Set expectations for PR responses

**When Closing PRs:**
- Always include clear rationale
- Thank contributor
- Offer path forward when appropriate
- Reference related PRs/issues

---

## Long-Term Prevention

### New Policies (implemented in Phase 4)

1. **PR Aging Policy**
   - 60 days without activity → auto-comment warning
   - 90 days without activity → auto-close with "stale" label
   - Draft PRs: 30/60 day timeline

2. **Bot PR Policy**
   - All bot PRs start as Draft
   - Human review required before "Ready for Review"
   - Bot PR checklist must be completed
   - No batch creation >20 PRs at once

3. **Review SLOs**
   - First review within 7 days
   - Final decision (merge/close) within 14 days
   - Exceptions for complex PRs (labeled explicitly)

4. **Triage Process**
   - Weekly 30-min triage meeting
   - Monthly PR health review
   - Quarterly policy review

### Infrastructure Improvements

1. **PR Health Dashboard** (Grafana or GitHub Insights)
   - Track: open count, age distribution, time-to-review, time-to-merge
   - Alerts when metrics exceed thresholds

2. **Automated Checks**
   - Stale bot (GitHub Actions)
   - Duplicate detection
   - Security scanning (Gitleaks, CodeQL)
   - Automated approvals for safe changes (Dependabot, docs)

3. **CI/CD Improvements** (coordinate with Jules)
   - Reduce flaky tests
   - Parallelize test suites
   - Faster feedback (<30 min for basic checks)
   - Clear separation: blocking vs. nice-to-have checks

---

## ROI and Benefits

### Immediate Benefits (Week 1-5)

- **Reduced review burden** - Reviewers focus on valuable PRs
- **Faster feedback loops** - Contributors get responses within SLO
- **Better code quality** - Time for thorough review instead of rushed
- **Team morale** - Clear backlog, contributors feel heard
- **Risk reduction** - Security issues triaged and tracked

### Long-Term Benefits (6+ months)

- **Sustainable velocity** - <100 PRs is maintainable with weekly triage
- **Contributor confidence** - Clear expectations and timely responses
- **Better AI/bot usage** - Human-in-loop prevents low-quality automated PRs
- **Process maturity** - Repeatable, documented workflows
- **Metrics-driven** - Data-informed decisions about review capacity

### Cost of Inaction

**If we don't triage:**
- Backlog continues growing (trend: +50-100 PRs/month)
- Review burden becomes impossible
- Valuable contributions lost or ignored
- Team burns out trying to keep up
- Emergency "declare PR bankruptcy" in 6 months

**Triage now vs. later:**
- 50-73 hours now (organized) vs. 100+ hours later (emergency mode)
- Preserves valuable work vs. bulk closure losing good contributions
- Builds sustainable process vs. repeating problem

---

## Recommendations

### Approve This Plan If:

✅ Engineering leadership commits to providing review capacity
✅ Team agrees to 5-week focused effort
✅ Triage lead identified and allocated 50% time
✅ Stakeholders support PR lifecycle policies

### Alternative Approaches (Not Recommended)

❌ **"Declare PR bankruptcy"** - Close all PRs >60 days
   - **Why not:** Loses valuable work, demotivates contributors

❌ **"Status quo"** - Continue without systematic triage
   - **Why not:** Problem will worsen, eventual crisis

❌ **"Hire our way out"** - Add reviewers without process change
   - **Why not:** Root cause is process, not just capacity

---

## Next Steps

### Immediate (This Week)

1. **Review and approve this plan** - Engineering leadership
2. **Assign triage lead** - Identify 1 person for coordination
3. **Communicate to team** - Post in Slack, set expectations
4. **Execute Day 1 actions** - Close first 8 duplicate PRs

### Week 1

1. **Follow Quick Start guide** - See `PR_TRIAGE_QUICK_START.md`
2. **Track daily progress** - Update metrics daily
3. **Adjust as needed** - Fine-tune based on Day 1-2 learnings
4. **Prepare for Week 2** - Run categorization scripts

### Ongoing

1. **Weekly triage meetings** - 30 min, every Friday
2. **Metrics review** - Dashboard check each Monday
3. **Policy iteration** - Adjust based on feedback
4. **Sustain <100 PRs** - Maintenance mode after Week 5

---

## Appendices

- **Full Plan:** `PR_TRIAGE_PLAN.md` (detailed 5-phase execution)
- **Quick Start:** `PR_TRIAGE_QUICK_START.md` (Week 1 actions)
- **Analysis:** `PR_ANALYSIS.md` (detailed PR breakdown)
- **Scripts:** See Appendix A in main plan

---

## Contact

**Questions or concerns?**
- Tag @BrianCLong on GitHub
- Post in #engineering-process Slack
- Comment on this document

**Ready to start?**
- ✅ Read `PR_TRIAGE_QUICK_START.md`
- ✅ Run Day 1 commands
- ✅ Track progress daily
- ✅ Report blockers immediately

---

**Let's clean up the backlog and build a sustainable PR process! 🚀**

**Last Updated:** 2025-11-20
**Owner:** Engineering Leadership
**Status:** Awaiting Approval
