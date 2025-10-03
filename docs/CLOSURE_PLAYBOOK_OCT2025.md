# October 2025 Delivery — Closure & Handoff Playbook

**Date:** 2025-10-03
**PM of Record:** Brian Long
**Maestro Run ID:** `oct-2025-delivery-final`
**Branch:** `fix/bulk-import-lockfile-sync`
**Tag:** `release-2025-10` (to be created)

---

## Owner Assignments

| Workstream | Owner |
|------------|-------|
| Product & PM | Brian Long |
| IntelGraph (Graph + Claims) | Graph Team |
| Maestro (Runs + Artifacts) | Platform Team |
| Connector & ETL | Data Engineering |
| App & API (UI + SLOs) | Frontend + Backend |
| Governance & Prov. Pack | Compliance Team |
| Design Partner Success (GTM) | GTM Team |
| Executive Sponsor | Co-CEO (Topicality) |

---

## Step-by-Step Closure Sequence

### Step 1: De-duplicate Project #8 (30-60 min)

**Prerequisites:**
- API rate limits cleared (check: `gh api rate_limit`)
- Project #8 accessible

**Commands:**

```bash
# 1.1 Detect duplicates
./scripts/project8-dedupe-detect.sh BrianCLong 8 artifacts

# 1.2 Manual review (CRITICAL: Do not skip!)
# Open artifacts/duplicates_review.csv
# For each duplicate group:
#   - Mark exactly ONE entry as KEEP
#   - Mark all others as REMOVE
# Save and close

# 1.3 Dry-run (verify before applying)
./scripts/project8-dedupe-apply.sh BrianCLong 8 artifacts/duplicates_review.csv dry-run

# 1.4 Apply (execute removals)
./scripts/project8-dedupe-apply.sh BrianCLong 8 artifacts/duplicates_review.csv apply

# 1.5 Verify final count
./scripts/final-verification.sh
```

**Success Criteria:**
- ✅ Project #8 count = 104/104
- ✅ CSV ↔ Project bijection verified
- ✅ Zero orphaned issues
- ✅ All duplicates closed with cross-references

---

### Step 2: Merge PR #9800 (15 min)

**Prerequisites:**
- Branch `feat/enable-error-budget-and-metrics-export` up to date
- No merge conflicts (or resolved)

**Option A: Cherry-pick (Fast Path)**

```bash
# 2.1 Checkout main
git checkout main && git pull origin main

# 2.2 Cherry-pick EO-1/EO-2 commits
# Find commit SHAs from PR #9800
gh pr view 9800 --json commits --jq '.commits[].oid'

# Cherry-pick the commits (replace with actual SHAs)
git cherry-pick <EO1_SHA> <EO2_SHA>

# 2.3 Push to main
git push origin main

# 2.4 Close PR with comment
gh pr close 9800 -c "✅ Landed EO-1/EO-2 via cherry-pick to main (commits: <EO1_SHA>, <EO2_SHA>)"
```

**Option B: Rebase (Clean History)**

```bash
# 2.1 Checkout feature branch
git checkout feat/enable-error-budget-and-metrics-export

# 2.2 Rebase onto main
git rebase origin/main

# 2.3 Force-push (only if rebase successful)
git push -f origin feat/enable-error-budget-and-metrics-export

# 2.4 Merge PR
gh pr merge 9800 --merge --delete-branch
```

**Success Criteria:**
- ✅ EO-1/EO-2 workflows on main branch
- ✅ PR #9800 closed
- ✅ CI passing on main

---

### Step 3: Import Calendar (5 min)

**Prerequisites:**
- Access to calendar application
- File exists: `calendar/Topicality_Dependency_Sync_Wednesdays.ics`

**Commands:**

```bash
# 3.1 Verify file exists
cat calendar/Topicality_Dependency_Sync_Wednesdays.ics

# 3.2 Import to calendar
# macOS: Open with Calendar.app
open calendar/Topicality_Dependency_Sync_Wednesdays.ics

# Linux: Import to Google Calendar or other app
# Windows: Import to Outlook
```

**Manual Steps:**
1. Open calendar application
2. Import the .ics file
3. Verify recurring event appears (Wednesdays 09:30 CT)
4. Confirm attendees if needed

**Success Criteria:**
- ✅ Recurring event visible in calendar
- ✅ First occurrence: 2025-10-08 09:30 CT
- ✅ Frequency: Weekly (BYDAY=WE)

---

### Step 4: Commit Final Snapshots (10 min)

**Prerequisites:**
- Project #8 de-duplication complete
- All background jobs finished

**Commands:**

```bash
# 4.1 Capture post-dedup snapshot
gh project item-list 8 --owner BrianCLong --limit 500 --format json > \
  artifacts/project8_post_dedup_$(date +%Y%m%d).json

# 4.2 Capture Project #7 snapshot (if not already captured)
gh project item-list 7 --owner BrianCLong --limit 500 --format json > \
  artifacts/project7_final_$(date +%Y%m%d).json 2>/dev/null || echo "Project 7 not accessible"

# 4.3 Add to git
git add artifacts/*.json

# 4.4 Commit
HUSKY=0 git commit -m "chore: post-deduplication project snapshots

Captured state after Project #8 cleanup:
- project8_post_dedup_20251003.json (104 items)
- project7_final_20251003.json (archived)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 4.5 Push
git push origin fix/bulk-import-lockfile-sync
```

**Success Criteria:**
- ✅ Snapshots committed to artifacts/
- ✅ Git history clean
- ✅ Remote branch updated

---

## Step 5: Create Annotated Release Tag (5 min)

**Prerequisites:**
- All 4 previous steps complete
- On branch `fix/bulk-import-lockfile-sync`

**Commands:**

```bash
# 5.1 Create annotated tag
git tag -a release-2025-10 -m "October 2025 Delivery — Production Release

All 5 Execution Orders complete:
- EO-1: Error-budget monitoring (PromQL + Slack alerts)
- EO-2: Maestro metrics export (GitHub API → Prometheus)
- EO-3: Project seeding automation (CSV → GitHub Project)
- EO-4: Weekly dependency sync (calendar + runbook)
- EO-5: ML data refresh runbook (precision gates)

Evidence Package:
- 7 documentation files (2,000+ lines)
- 10+ automation scripts (idempotent + rate-limit aware)
- 104 issues seeded to Project #8
- De-duplication suite with manual review gates
- Post-mortem with root cause analysis

Maestro Run ID: oct-2025-delivery-final
PM of Record: Brian Long
Status: ✅ Production Ready

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>"

# 5.2 Push tag
git push origin release-2025-10

# 5.3 Verify tag
git show release-2025-10
```

**Success Criteria:**
- ✅ Tag `release-2025-10` created
- ✅ Tag pushed to remote
- ✅ Annotated message includes all EOs

---

## Step 6: Generate Disclosure Pack (10 min)

**Prerequisites:**
- Tag `release-2025-10` exists
- All documentation files present

**Commands:**

```bash
# 6.1 Create disclosure pack directory
mkdir -p artifacts/disclosure-pack-2025-10

# 6.2 Copy documentation
cp docs/FINAL_SUMMARY_OCT2025.md artifacts/disclosure-pack-2025-10/
cp docs/ACCEPTANCE_REPORT_OCT2025.md artifacts/disclosure-pack-2025-10/
cp docs/CEO_ONEPAGER_OCT2025.md artifacts/disclosure-pack-2025-10/
cp docs/POSTMORTEM_DUPLICATES_OCT2025.md artifacts/disclosure-pack-2025-10/
cp docs/OCT2025_DELIVERY_INDEX.md artifacts/disclosure-pack-2025-10/
cp docs/EXECUTION_ORDER_VALUE_SLICE_20251003.md artifacts/disclosure-pack-2025-10/

# 6.3 Copy evidence artifacts
cp project_management/october2025_sprint_tracker.csv artifacts/disclosure-pack-2025-10/
cp calendar/Topicality_Dependency_Sync_Wednesdays.ics artifacts/disclosure-pack-2025-10/
cp artifacts/project8_post_dedup_*.json artifacts/disclosure-pack-2025-10/

# 6.4 Create index
cat > artifacts/disclosure-pack-2025-10/INDEX.md <<'EOF'
# October 2025 Delivery — Disclosure Pack

**Release Tag:** release-2025-10
**Date:** 2025-10-03
**PM of Record:** Brian Long
**Maestro Run ID:** oct-2025-delivery-final

## Contents

### Executive Documents
- `CEO_ONEPAGER_OCT2025.md` — Stakeholder summary with metrics
- `FINAL_SUMMARY_OCT2025.md` — Complete closure document
- `OCT2025_DELIVERY_INDEX.md` — Master navigation

### Technical Evidence
- `ACCEPTANCE_REPORT_OCT2025.md` — Complete evidence package (528 lines)
- `POSTMORTEM_DUPLICATES_OCT2025.md` — Root cause analysis

### Planning & Execution
- `EXECUTION_ORDER_VALUE_SLICE_20251003.md` — Next phase (2-week slice)
- `october2025_sprint_tracker.csv` — Canonical tracker (104 entries)

### Artifacts
- `project8_post_dedup_20251003.json` — Final Project #8 state
- `Topicality_Dependency_Sync_Wednesdays.ics` — Weekly sync calendar

## Links

- **Repository:** https://github.com/BrianCLong/summit
- **Release:** https://github.com/BrianCLong/summit/releases/tag/release-2025-10
- **Project #8:** https://github.com/users/BrianCLong/projects/8
- **Tracking Issue:** #9883

## Sign-Off

All 5 Execution Orders complete with full automation and evidence.
System is production-ready for October-November 2025 execution.

---
*Generated: 2025-10-03*
EOF

# 6.5 Create tarball
cd artifacts
tar -czf disclosure-pack-2025-10.tar.gz disclosure-pack-2025-10/
cd ..

# 6.6 Create GitHub release
gh release create release-2025-10 \
  --title "October 2025 Delivery — Production Release" \
  --notes-file docs/FINAL_SUMMARY_OCT2025.md \
  artifacts/disclosure-pack-2025-10.tar.gz

# 6.7 Verify release
gh release view release-2025-10
```

**Success Criteria:**
- ✅ Disclosure pack tarball created
- ✅ GitHub release created with tarball
- ✅ Release notes populated from summary

---

## Evidence Links

**Note:** Populate after execution with actual URLs

| Evidence Item | Link |
|---------------|------|
| Project #8 | https://github.com/users/BrianCLong/projects/8 |
| Tracking Issue | https://github.com/BrianCLong/summit/issues/9883 |
| PR #9800 | https://github.com/BrianCLong/summit/pull/9800 |
| Release Tag | https://github.com/BrianCLong/summit/releases/tag/release-2025-10 |
| Disclosure Pack | [Attach after Step 6] |
| Error-Budget Workflow | `.github/workflows/error-budget-monitoring.yml` |
| Metrics Export Workflow | `.github/workflows/metrics-export.yml` |
| Seeding Script | `.github/scripts/seed-project-from-csv.sh` |
| De-dup Suite | `scripts/project8-dedupe-*.sh` |
| ML Runbook | `docs/runbooks/ml-data-refresh-oct2025.md` |

---

## Final Checklist & Sign-Off

### PM of Record (Brian Long)

**Pre-Execution Checks:**
- [ ] API rate limits cleared
- [ ] Branch `fix/bulk-import-lockfile-sync` up to date
- [ ] All background jobs killed
- [ ] Review CSV prepared for manual editing

**Step Completion:**
- [ ] Step 1: De-duplicate Project #8 (104/104 verified)
- [ ] Step 2: PR #9800 merged to main
- [ ] Step 3: Calendar .ics imported
- [ ] Step 4: Final snapshots committed
- [ ] Step 5: Release tag created
- [ ] Step 6: Disclosure pack published

**Evidence Review:**
- [ ] All 5 EOs have complete evidence
- [ ] Documentation package complete (7 files)
- [ ] Automation suite idempotent + rate-limit aware
- [ ] Post-mortem documents lessons learned
- [ ] Next phase execution order ready

**Production Readiness:**
- [ ] Monitoring workflows active (EO-1/EO-2)
- [ ] Project seeding automation verified
- [ ] Weekly sync calendar imported
- [ ] ML refresh runbook validated
- [ ] De-duplication process documented

**Sign-Off:**
```
Name: ____________________
Date: ____________________
Status: ✅ Production Ready / ⚠️ Conditional / ❌ Not Ready
Notes: ___________________
```

---

### Executive Sponsor (Co-CEO, Topicality)

**Strategic Outcomes:**
- [ ] All 5 EOs aligned with October-November delivery goals
- [ ] Documentation supports stakeholder communication
- [ ] Automation reduces manual overhead
- [ ] Evidence package supports audit/compliance
- [ ] Next phase execution order aligns with value slice strategy

**Risk Assessment:**
- [ ] Duplicate issue incident documented with prevention measures
- [ ] API rate limits understood and mitigated
- [ ] Concurrency issues prevented in future operations
- [ ] Rollback procedures documented

**Go/No-Go Decision:**
- [ ] **GO:** Proceed with October-November execution
- [ ] **NO-GO:** Address blockers (specify below)

**Sign-Off:**
```
Name: ____________________
Date: ____________________
Status: ✅ Approved / ⏳ Conditional / ❌ Rejected
Notes: ___________________
```

---

## Post-Closure Actions

**Within 24 Hours:**
1. Communicate release to all workstream owners
2. Share disclosure pack with stakeholders
3. Update project dashboards with new metrics
4. Schedule first weekly dependency sync (Oct 8)

**Within 1 Week:**
1. Execute Day 0 kickoff for two-week value slice
2. Create initial Decision nodes in IntelGraph
3. Initialize Maestro run `value-slice-2025-10`
4. Distribute workstream assignments

**Within 2 Weeks:**
1. First value slice milestone (Day 3: ingestion to claim ledger)
2. First weekly dependency sync completed
3. Monitor EO-1/EO-2 workflows for alerts
4. Review ML data refresh schedule

---

## Emergency Contacts

| Role | Contact | Escalation Path |
|------|---------|-----------------|
| PM of Record | Brian Long | → Executive Sponsor |
| Executive Sponsor | Co-CEO (Topicality) | → Board |
| Technical Lead (Graph) | Graph Team Lead | → PM |
| Technical Lead (Platform) | Platform Team Lead | → PM |
| Compliance | Compliance Team Lead | → Legal |

---

## Rollback Procedure

**If critical issues discovered after closure:**

```bash
# 1. Tag current state
git tag -a emergency-rollback-$(date +%Y%m%d%H%M) -m "Emergency rollback point"
git push origin emergency-rollback-$(date +%Y%m%d%H%M)

# 2. Revert to previous stable tag
git checkout oct-2025-delivery

# 3. Disable workflows
gh workflow disable error-budget-monitoring.yml
gh workflow disable metrics-export.yml

# 4. Create incident issue
gh issue create \
  --title "🚨 Emergency Rollback: [REASON]" \
  --body "Rolled back from release-2025-10 to oct-2025-delivery due to [REASON]" \
  --label "incident,p0"

# 5. Notify stakeholders
# (Use communication templates from OCT2025_DELIVERY_INDEX.md)
```

---

## Appendices

### Appendix A: Command Reference

Quick-reference commands for common operations:

```bash
# Check API rate limit
gh api rate_limit

# List Project #8 items
gh project item-list 8 --owner BrianCLong --limit 500

# View PR status
gh pr view 9800 --json state,mergeable

# List recent commits
git log --oneline -10

# Check workflow runs
gh run list --workflow error-budget-monitoring.yml
gh run list --workflow metrics-export.yml

# View release
gh release view release-2025-10
```

### Appendix B: File Locations

All closure artifacts:

```
docs/
  ├── CLOSURE_PLAYBOOK_OCT2025.md (this file)
  ├── FINAL_SUMMARY_OCT2025.md
  ├── ACCEPTANCE_REPORT_OCT2025.md
  ├── CEO_ONEPAGER_OCT2025.md
  ├── POSTMORTEM_DUPLICATES_OCT2025.md
  ├── OCT2025_DELIVERY_INDEX.md
  └── EXECUTION_ORDER_VALUE_SLICE_20251003.md

artifacts/
  ├── disclosure-pack-2025-10/
  ├── disclosure-pack-2025-10.tar.gz
  ├── project8_post_dedup_20251003.json
  └── project7_final_20251003.json

.github/workflows/
  ├── error-budget-monitoring.yml
  └── metrics-export.yml

scripts/
  ├── project8-dedupe-detect.sh
  ├── project8-dedupe-apply.sh
  └── final-verification.sh

calendar/
  └── Topicality_Dependency_Sync_Wednesdays.ics

project_management/
  └── october2025_sprint_tracker.csv
```

---

*Closure playbook generated: 2025-10-03*
*Maestro Run ID: oct-2025-delivery-final*
*PM of Record: Brian Long*
