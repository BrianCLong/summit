# Stabilization Roadmap Handoff

## Overview

The **Stabilization Roadmap Handoff** is a rule-based system that transforms monthly [stabilization retrospective](./STABILIZATION_RETROSPECTIVE.md) insights into actionable roadmap candidates for systemic improvements. It ensures that recurring issues and metric regressions are elevated to the product roadmap **without spam** and **without bypassing governance**.

## What Is a Stabilization Roadmap Candidate?

A **roadmap candidate** is a proposed systemic improvement derived from retrospective metrics. Each candidate:

1. **Is Rule-Based**: Triggered by objective metric thresholds, not subjective narratives
2. **Is Evidence-Backed**: Cites specific metrics, time windows, and retrospective data
3. **Is Scoped to Systemic Fixes**: Focuses on process, governance, or technical improvements—NOT new features
4. **Has a Stable Identifier**: A slug (e.g., `issuance-hygiene`) for deduplication
5. **Has Clear Acceptance Criteria**: Metrics-based success measures

### Example Candidates

| Slug | Title | Category | Trigger |
|------|-------|----------|---------|
| `issuance-hygiene` | Issuance Hygiene Improvements | Process | `blocked_unissued_p0 > 0` |
| `evidence-compliance` | Evidence Collection & Compliance | Governance | `evidence_compliance < 95%` |
| `p0-sla-adherence` | P0 SLA Adherence | Process | `overdue_p0 > 0` in ≥2 weeks |
| `systemic-risk-reduction` | Systemic Risk Reduction | Technical | `risk_index_avg ≥ 30` |
| `on-time-delivery` | On-Time Delivery Improvements | Process | `on_time_rate < 80%` |
| `ci-gate-stability` | CI/CD Gate Stability | Infrastructure | Recurring CI failures |

## How Triggers Work

### Rule-Based Evaluation

Each candidate is evaluated using **deterministic triggers** defined in `.github/releases/stabilization-policy.yml`:

```yaml
stabilization:
  roadmap_handoff:
    thresholds:
      recurring_overdue_weeks: 2
      min_risk_index_avg: 30
      evidence_compliance_min: 0.95
      blocked_unissued_p0_threshold: 0
      overdue_p0_threshold: 0
      on_time_rate_min: 0.80
```

### Trigger Logic

**Script**: `scripts/releases/derive_stabilization_roadmap_candidates.mjs`

For each candidate slug:

1. **Extract Metrics**: Read metric series from retrospective JSON
2. **Calculate Aggregates**: Averages, counts, trends
3. **Evaluate Condition**: Compare against policy thresholds
4. **Score**: Calculate severity + persistence score
5. **Select Top N**: Sort by score, take top 5 (configurable)

### Example: Issuance Hygiene Trigger

```javascript
// Trigger: blocked_unissued_p0 > 0 in any week
const weeksWithBlockedUnissuedP0 = retro.series.blocked_unissued_p0
  .filter(v => v > thresholds.blocked_unissued_p0_threshold).length;

if (weeksWithBlockedUnissuedP0 >= 1) {
  candidates.push({
    slug: 'issuance-hygiene',
    severity: lastWeek.blocked_unissued_p0 > 0 ? 'critical' : 'high',
    persistence: weeksWithBlockedUnissuedP0,
    score: calculateScore('critical', weeksWithBlockedUnissuedP0),
    trigger: 'blocked_unissued_p0 > 0'
  });
}
```

### Scoring Algorithm

**Formula**: `score = severity_weight + (persistence * 10)`

**Severity Weights** (from policy):
- Critical: 100
- High: 70
- Medium: 40
- Low: 20

**Persistence Multiplier**: +10 per week the issue persists

**Example**:
- **Issue**: P0 overdue in 3/4 weeks
- **Severity**: Critical (100)
- **Persistence**: 3 weeks
- **Score**: 100 + (3 × 10) = **130**

### Selection Process

1. **Evaluate All Triggers**: Run all 6+ trigger rules
2. **Score All Candidates**: Compute severity + persistence score
3. **Sort Descending**: Highest score first
4. **Select Top N**: Take top 5 (configurable via `--max-candidates`)

**Output**: `candidates.json` with selected candidates

## Draft vs. Apply Modes

The handoff system operates in two modes to balance automation with governance:

### Draft Mode (Default, Recommended)

**Mode**: `draft`

**Behavior**:
- ✅ Generate markdown drafts in `artifacts/stabilization/roadmap-handoff/drafts/`
- ✅ Generate digest with rationale and evidence
- ✅ Upload artifacts to CI
- ✅ Create PR with drafts for review
- ❌ **Do NOT create GitHub issues**

**Use When**:
- Initial rollout and testing
- Monthly routine operations
- Want manual triage before creating issues
- Verifying candidate quality

**Safety**: No issues created, no spam risk, fully reversible

### Apply Mode (Opt-In)

**Mode**: `apply`

**Behavior**:
- ✅ Generate markdown drafts
- ✅ Search for existing issues by slug marker
- ✅ Create **new issues** if none exist
- ✅ Update **existing issues** if found (by slug)
- ✅ Apply labels: `roadmap`, `stabilization`, `needs-triage`, category, severity

**Use When**:
- Team has reviewed and approved draft candidates
- Ready to track candidates as GitHub issues
- Want automatic issue management

**Safety**: Dedupe prevents spam (see below)

### Switching from Draft to Apply

**Step-by-Step**:

1. **Start in Draft Mode** (default):
   ```bash
   gh workflow run stabilization-retrospective.yml -f mode=draft
   ```

2. **Review Generated Drafts**:
   - Check `artifacts/stabilization/roadmap-handoff/drafts/`
   - Review `digest.md` for candidate rationale
   - Verify evidence and acceptance criteria

3. **Triage Candidates**:
   - Decide which candidates to track as issues
   - Adjust policy thresholds if needed (see below)
   - Get team buy-in

4. **Enable Apply Mode**:
   ```bash
   gh workflow run stabilization-retrospective.yml -f mode=apply
   ```

5. **Verify Issue Creation**:
   - Check GitHub issues with label `stabilization`
   - Verify slug markers in issue bodies
   - Confirm no duplicates

6. **Iterate**: Continue in apply mode for monthly automation

**Recommendation**: Start with **2-3 months in draft mode** to build confidence.

## Deduplication by Slug

### Problem: Avoiding Spam

Without dedupe, the system would create a **new issue every month** for the same recurring problem (e.g., 12 issues/year for `p0-sla-adherence`).

### Solution: Stable Slug Identifiers

Each candidate has a **stable slug** that uniquely identifies its category:

- `issuance-hygiene`
- `evidence-compliance`
- `p0-sla-adherence`
- `systemic-risk-reduction`
- `on-time-delivery`
- `ci-gate-stability`

### Marker Embedding

Every draft and GitHub issue includes a **marker line** in the body:

```markdown
**Stabilization Roadmap Candidate Marker:** `issuance-hygiene`
```

### Search & Dedupe Logic

**Script**: `scripts/releases/sync_stabilization_roadmap_handoff.mjs`

Before creating an issue:

1. **Search Existing Issues**:
   ```bash
   gh issue list --search "Stabilization Roadmap Candidate Marker: issuance-hygiene" \
     --json number,title,state --limit 5
   ```

2. **Check State**: Filter for `state === 'open'`

3. **Decision**:
   - **Found Open Issue**: Update existing issue body with latest draft
   - **No Open Issue**: Create new issue

**Result**: At most **1 open issue per slug** at any time.

### Lifecycle

- **Month 1**: Candidate triggers → Issue #123 created (`issuance-hygiene`)
- **Month 2**: Same candidate triggers → Issue #123 **updated** (not duplicated)
- **Month 3**: Candidate no longer triggers (fixed!) → No action
- **Month 4**: Candidate triggers again → Issue #123 **reopened or updated**

### Slug Stability

**Q**: What if we want to change a slug?

**A**: Slugs are **semantic constants**. Changing a slug is equivalent to creating a new candidate type. If needed:
1. Mark old slug as deprecated in policy
2. Add new slug with clear migration note
3. Manually close old issue and reference new one

## Overriding Thresholds

### Why Override?

- **False Positives**: Candidate triggers too frequently
- **False Negatives**: Important issue not triggering
- **Team Context**: Different risk tolerance or priorities

### How to Override

**File**: `.github/releases/stabilization-policy.yml`

**Example**: Tighten evidence compliance threshold

```yaml
stabilization:
  roadmap_handoff:
    thresholds:
      evidence_compliance_min: 0.98  # Raised from 0.95
```

**Example**: Require more persistence for overdue P0s

```yaml
stabilization:
  roadmap_handoff:
    thresholds:
      recurring_overdue_weeks: 3  # Raised from 2
```

**Example**: Lower risk index sensitivity

```yaml
stabilization:
  roadmap_handoff:
    thresholds:
      min_risk_index_avg: 40  # Raised from 30 (less sensitive)
```

### Testing Overrides

**Test locally before committing**:

```bash
# 1. Generate retrospective
node scripts/releases/generate_stabilization_retrospective.mjs

# 2. Derive candidates with custom policy
node scripts/releases/derive_stabilization_roadmap_candidates.mjs \
  --retro=artifacts/stabilization/retrospective/retro_<timestamp>.json \
  --policy=.github/releases/stabilization-policy.yml \
  --out-file=test-candidates.json

# 3. Review candidates
cat test-candidates.json | jq '.candidates | .[] | {slug, severity, score}'
```

### Override Impact Analysis

Before changing thresholds, analyze historical data:

```bash
# Run retrospective with different windows
for weeks in 4 8 12; do
  node scripts/releases/generate_stabilization_retrospective.mjs --weeks=$weeks
  node scripts/releases/derive_stabilization_roadmap_candidates.mjs \
    --retro=artifacts/stabilization/retrospective/retro_*.json \
    --out-file=candidates-${weeks}w.json
done

# Compare candidate counts
jq '.candidates | length' candidates-*w.json
```

**Recommendation**: Use **4-week window** for routine analysis, **8-12 weeks** for threshold tuning.

## Candidate Lifecycle

### 1. Discovery (Automated)

- **Trigger**: Monthly retrospective identifies candidate via rule-based trigger
- **Output**: Draft proposal with evidence and acceptance criteria
- **Location**: `artifacts/stabilization/roadmap-handoff/drafts/`

### 2. Triage (Manual)

- **Owner**: Release team, engineering leads
- **Actions**:
  - Review draft proposals
  - Validate evidence and rationale
  - Assign owner and priority
  - Decide to accept/reject/defer

- **Labels**:
  - `needs-triage` → `triaged`
  - Add owner, priority, milestone

### 3. Implementation (Manual)

- **Owner**: Assigned engineer/team
- **Actions**:
  - Execute proposed scope (systemic fix)
  - Add monitoring for acceptance criteria
  - Update issue with progress

### 4. Verification (Automated)

- **Trigger**: Next month's retrospective
- **Check**: Are acceptance criteria met?
  - Example: `overdue_p0 = 0` for 4 consecutive weeks?
- **Action**: If met, candidate no longer triggers

### 5. Closure (Manual)

- **Owner**: Assigned engineer/team
- **Actions**:
  - Verify acceptance criteria in retrospective
  - Document lessons learned
  - Close issue with summary

## Running the Handoff

### Via GitHub Actions (Recommended)

**Automatic**: Runs monthly with retrospective workflow

**Manual Trigger**:

```bash
# Draft mode
gh workflow run stabilization-retrospective.yml -f mode=draft

# Apply mode
gh workflow run stabilization-retrospective.yml -f mode=apply
```

### Via Command Line

**Full Pipeline**:

```bash
# 1. Generate retrospective
node scripts/releases/generate_stabilization_retrospective.mjs \
  --weeks=4

# 2. Derive candidates
node scripts/releases/derive_stabilization_roadmap_candidates.mjs \
  --retro=artifacts/stabilization/retrospective/retro_<timestamp>.json \
  --max-candidates=5 \
  --out-file=candidates.json

# 3. Generate drafts (draft mode)
node scripts/releases/sync_stabilization_roadmap_handoff.mjs \
  --candidates=candidates.json \
  --retro=artifacts/stabilization/retrospective/retro_<timestamp>.json \
  --mode=draft

# 4. Create issues (apply mode)
export GITHUB_TOKEN=<token>
node scripts/releases/sync_stabilization_roadmap_handoff.mjs \
  --candidates=candidates.json \
  --retro=artifacts/stabilization/retrospective/retro_<timestamp>.json \
  --mode=apply
```

### Parameters

#### derive_stabilization_roadmap_candidates.mjs

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--retro` | (required) | Path to retrospective JSON |
| `--policy` | (optional) | Path to policy YAML |
| `--max-candidates` | 5 | Maximum candidates to emit |
| `--out-file` | stdout | Output file path |

#### sync_stabilization_roadmap_handoff.mjs

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--candidates` | (required) | Path to candidates JSON |
| `--retro` | (required) | Path to retrospective JSON |
| `--out-dir` | `artifacts/stabilization/roadmap-handoff` | Output directory |
| `--mode` | `draft` | Mode: `draft` or `apply` |
| `--github-token` | `$GITHUB_TOKEN` | GitHub token (required for apply) |

## Output Artifacts

### Drafts

**Path**: `artifacts/stabilization/roadmap-handoff/drafts/ROADMAP_<slug>.md`

**Contents**:
- Problem statement with evidence
- Proposed scope (systemic fix)
- Acceptance criteria (metrics-based)
- Risks and dependencies
- Owner and routing placeholders

### Digest

**Path**: `artifacts/stabilization/roadmap-handoff/digest.md`

**Contents**:
- Summary of all selected candidates
- Rationale and evidence for each
- Links to draft proposals
- Next steps guidance

### GitHub Issues (Apply Mode Only)

**Labels**:
- `roadmap`
- `stabilization`
- Category: `process`, `governance`, `technical-debt`, `infrastructure`
- Severity: `severity:critical`, `severity:high`, `severity:medium`
- Triage: `needs-triage`

**Body**: Same as draft markdown, with slug marker for dedupe

## Policy Configuration

**File**: `.github/releases/stabilization-policy.yml`

**Key Sections**:

```yaml
stabilization:
  roadmap_handoff:
    enabled: true
    mode: draft  # draft | apply
    max_candidates: 5

    thresholds:
      recurring_overdue_weeks: 2
      min_risk_index_avg: 30
      evidence_compliance_min: 0.95
      # ... more thresholds

    github:
      labels:
        base: [roadmap, stabilization]
        triage: [needs-triage]
        categories:
          process: process
          governance: governance
          technical: technical-debt
          infrastructure: infrastructure

      dedupe_by_slug: true

governance:
  require_review_for_apply: true
  auto_approve_drafts: true
```

See [Stabilization Policy](../../.github/releases/stabilization-policy.yml) for full configuration.

## Troubleshooting

### No Candidates Generated

**Symptom**: `candidates.json` is empty or has 0 candidates

**Resolution**:
- Check retrospective metrics: Are they within acceptable ranges?
- Review policy thresholds: May be too strict
- Verify trigger logic in `derive_stabilization_roadmap_candidates.mjs`

### Too Many Candidates

**Symptom**: More than 5 candidates generated, want to reduce noise

**Resolution**:
- Tighten thresholds in policy (e.g., raise `min_risk_index_avg`)
- Increase `recurring_overdue_weeks` to require more persistence
- Reduce `max_candidates` in policy

### Duplicate Issues Created

**Symptom**: Multiple issues for the same slug

**Resolution**:
- Verify `dedupe_by_slug: true` in policy
- Check slug marker in issue bodies: `Stabilization Roadmap Candidate Marker:`
- Ensure `gh` CLI is available and `GITHUB_TOKEN` is valid
- Review search logic in `sync_stabilization_roadmap_handoff.mjs`

### Issue Update Fails

**Symptom**: Existing issue not updated in apply mode

**Resolution**:
- Check GitHub token permissions: Needs `issues: write`
- Verify issue state: Only `open` issues are updated
- Check `gh` CLI version: Ensure recent version
- Review error logs in CI artifacts

## Best Practices

### 1. Start Small

- Begin with **draft mode** for 2-3 months
- Review candidate quality before enabling apply mode
- Tune thresholds based on team feedback

### 2. Triage Regularly

- Review drafts in monthly retrospective meeting
- Assign owners promptly to prevent backlog
- Close issues quickly once fixed

### 3. Measure Impact

- Track acceptance criteria metrics in subsequent retrospectives
- Verify that systemic fixes reduce candidate recurrence
- Iterate on proposed scopes based on outcomes

### 4. Avoid Scope Creep

- Keep candidates focused on **systemic fixes**, not features
- Reject candidates that are too broad or vague
- Break large candidates into smaller, focused issues

### 5. Document Lessons

- When closing issues, document what worked and what didn't
- Update policy thresholds based on historical data
- Share learnings with team in retrospective reviews

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-14 | Initial release |

## See Also

- [Stabilization Retrospective](./STABILIZATION_RETROSPECTIVE.md)
- [Stabilization Policy](../../.github/releases/stabilization-policy.yml)
- [Weekly Stabilization Closeout](./WEEKLY_STABILIZATION.md) (if exists)

## Support

For questions or issues:
- File a GitHub issue with label `stabilization`
- Contact: `#release-team` (Slack)
- Maintainers: See `stabilization-policy.yml` metadata
