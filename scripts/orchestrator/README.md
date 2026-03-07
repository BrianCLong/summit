# Summit AI Engineering OS - Orchestrator Documentation

## Overview

The Summit Orchestrator is a fully autonomous, self-healing PR management system designed to process 10,000+ PRs/day with zero human intervention. It implements 15 pillars of automation across 5 phases.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GITHUB ACTIONS TRIGGERS                       │
│  • Every 15min: PR Intake (classify, label, assign concerns)    │
│  • Every 2hrs: Master Orchestrator (full cycle)                 │
│  • Every 4hrs: Mass Harvest (batch merge)                       │
│  • Daily: Self-Healing Loop (learn, compress, hunt entropy)     │
│  • On CI Fail: Circuit Breaker (auto-revert)                    │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 1: INTAKE & CLASSIFICATION                    │
│  1. auto_concern_detector.mjs → Auto-assign /concern to PRs     │
│  2. pr-classifier.mjs → Apply queue labels (merge-now, etc)     │
│  3. canonical_survivor_selector.mjs → Pick best PR per concern  │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 2: RECOVERY & MATURATION                      │
│  4. omni_rebase_recovery.mjs → Resurrect + AI conflict resolve  │
│  5. semantic_slicer_maturer.mjs → Break monolithic PRs          │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PHASE 3: INTEGRATION                           │
│  6. mass_harvest_train.mjs → Batch merge queue:merge-now PRs    │
│  7. semantic_architecture_sentinel.mjs → Guard boundaries        │
│  8. test_impact_analyzer.mjs → Selective CI execution           │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│            PHASE 4: SELF-HEALING & LEARNING                      │
│  9. circuit_breaker.mjs → Auto-revert breaking commits          │
│  10. autodidactic_feedback_engine.mjs → Learn from failures     │
│  11. meta_librarian.mjs → Compress learnings                    │
│  12. ai_tech_lead.mjs → Diagnose stuck PRs                      │
│  13. finops_governor.mjs → Prevent AI thrashing                 │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│          PHASE 5: MAINTENANCE & DOCUMENTATION                    │
│  14. architecture_mapper.mjs → Update architecture docs         │
│  15. entropy_hunter.mjs → Detect tech debt                      │
│  16. epistemic_ledger_auto_adr.mjs → Generate ADRs              │
└─────────────────────────────────────────────────────────────────┘
```

## Core Scripts

### 1. Master Orchestrator (`master_orchestrator.mjs`)

**Purpose:** Runs all 15 pillars in sequence for a complete autonomous cycle.

**Usage:**
```bash
REPO="owner/repo" GITHUB_TOKEN="..." node scripts/orchestrator/master_orchestrator.mjs
```

**Environment Variables:**
- `REPO` (required): GitHub repository (owner/repo format)
- `GITHUB_TOKEN` (required): GitHub API token
- `DRY_RUN` (optional): Set to `true` for dry-run mode
- `OPENAI_API_KEY` (optional): For AI conflict resolution
- `ANTHROPIC_API_KEY` (optional): Primary AI provider
- `GEMINI_API_KEY` (optional): Fallback AI provider

**Output:** `artifacts/orchestration-cycle.json`

### 2. Auto-Concern Detector (`auto_concern_detector.mjs`)

**Purpose:** Automatically assigns `/concern <key>` to PRs based on content analysis.

**Algorithm:**
1. Analyze PR title, body, file paths
2. Score against keyword patterns
3. Assign highest-scoring concern
4. Update PR body with `/concern` and `/supersedes none`

**Concerns Detected:**
- `agent-control-plane` - Agent/orchestration work
- `evidence-governance` - Compliance/audit work
- `workflow-automation` - CI/GitHub Actions
- `authentication` - Auth/security
- `knowledge-graph` - Graph/Neo4j work
- `epistemic-system` - Epistemology features
- `api`, `frontend`, `database`, `testing`, `documentation`, `performance`, `ml-platform`, `intelligence-platform`
- `general` - Fallback

### 3. PR Classifier (`pr-classifier.mjs`)

**Purpose:** Apply queue labels based on mergeable state and governance rules.

**Queue Labels:**
- `queue:merge-now` - Clean, mergeable, ready to harvest
- `queue:needs-rebase` - Behind main, needs rebase
- `queue:conflict` - Has merge conflicts
- `queue:blocked` - Touches governed paths without `/concern`
- `queue:obsolete` - Superseded by canonical survivor

**Governance Rules:**
- PRs touching `.github/`, `docs/governance/`, `infra/`, `scripts/pr/` MUST have `/concern`

### 4. Canonical Survivor Selector (`canonical_survivor_selector.mjs`)

**Purpose:** Pick the best PR per concern cluster using quality scoring.

**Quality Score (0-1):**
- Recency: +0.3 (newer is better)
- Mergeable: +0.4 (clean state)
- Not draft: +0.15
- Has reviews: +0.1
- Not already superseded: +0.05

**Actions:**
- Highest-scoring PR → `canonical-survivor` + `queue:merge-now` (if mergeable)
- Others → `superseded` + `queue:obsolete`

### 5. Omni-Recovery (`omni_rebase_recovery.mjs`)

**Purpose:** Resurrect closed PRs and resolve conflicts with AI.

**Process:**
1. Fetch all unmerged PRs (open + closed)
2. Create `recovery/pr-<number>` branches from `origin/main`
3. Attempt `git merge --no-edit pr-<number>-head`
4. If conflicts:
   - Lockfiles (pnpm-lock.yaml, package-lock.json, etc) → Reset to main, regenerate
   - Code files → Send to AI (Anthropic/OpenAI/Gemini) for semantic resolution
   - Fallback: Union merge with comments
5. Push recovery branch
6. Create new PR with `canonical-survivor,queue:merge-now` labels
7. Close original PR

**AI Conflict Resolution:**
Uses LLM to intelligently merge both sides' changes. Falls back to deterministic union merge if no AI keys configured.

### 6. Semantic Slicer (`semantic_slicer_maturer.mjs`)

**Purpose:** Break monolithic PRs into atomic, mergeable sub-PRs.

**Process:**
1. Read `artifacts/recovery_requests.json` for complex PRs
2. Use AI to identify independent logical changes
3. Extract each change to `recovery/sliced-<pr>-part<N>` branch
4. Auto-generate missing tests and types
5. Create new PRs with `canonical-survivor,queue:merge-now`
6. Close original PR with explanation

**Limit:** 5 PRs per run (configurable)

### 7. Mass Harvest Train (`mass_harvest_train.mjs`)

**Purpose:** Batch-merge up to 50 PRs in a single speculative integration.

**Process:**
1. Fetch all `queue:merge-now` PRs (max 200, batch to 50)
2. Create `integration/harvest-<timestamp>` branch from `main`
3. Attempt `git merge --no-edit` for each PR
4. Skip PRs with conflicts (kick back to `queue:needs-rebase`)
5. Push integration branch for shadow CI
6. If CI passes: fast-forward merge to main
7. Generate `artifacts/harvest/harvest_manifest.json`

**Configuration:**
- `HARVEST_MAX_BATCH_SIZE` (default: 50)

### 8. Circuit Breaker (`circuit_breaker.mjs`)

**Purpose:** Auto-revert commits that break main CI.

**Process:**
1. Detect CI failure on main branch
2. Identify breaking commit (`git log -1`)
3. `git revert <commit>`
4. Push revert to restore main to green
5. Comment on offending PR
6. Relabel PR as `queue:conflict,reverted`

**Fallback:** For merge commits, uses `git revert -m 1`

### 9. SAFE Autodidactic Loop (`autodidactic_feedback_engine.mjs`)

**Purpose:** Learn from failures and synthesize permanent rules.

**Process:**
1. Scan last 20 closed, unmerged PRs
2. Fetch CI logs, diff, rejection comments
3. Use LLM to extract root causes and patterns
4. Generate CRITICAL RULES
5. Append to `.learnings/AGENT_DIRECTIVES.md`
6. Auto-commit to main

**Output:** Self-evolving coding guidelines

### 10. Meta-Librarian (`meta_librarian.mjs`)

**Purpose:** Compress `.learnings/AGENT_DIRECTIVES.md` to maximum density.

**Process:**
1. Read all directives
2. Remove duplicates
3. Resolve contradictions (newer wins)
4. Group by architectural headers
5. Write `.learnings/GOLDEN_CONTEXT.md`

**Trigger:** When directives exceed 500 chars

### 11. AI Tech Lead (`ai_tech_lead.mjs`)

**Purpose:** Diagnose and create action plans for stuck PRs.

**Process:**
1. Fetch PRs with `queue:blocked`, `queue:manual`, `sentinel-rejected`
2. Read CI logs, sentinel rejections, diffs
3. Use LLM to synthesize implementation plan
4. Emit JSON delegation spec to `artifacts/recovery_requests.json`
5. Post diagnosis + plan as PR comment
6. Auto-assign bot

### 12. Entropy Hunter (`entropy_hunter.mjs`)

**Purpose:** Proactively detect tech debt.

**Process:**
1. Weekly scan of main branch
2. Identify largest/frequently-changed files
3. Use AI to detect:
   - Code duplication
   - High cyclomatic complexity
   - Dead code
4. Emit refactoring tasks to `artifacts/recovery_requests.json`
5. Mark as `is_tech_lead_dispatch: true`

### 13. Architecture Mapper (`architecture_mapper.mjs`)

**Purpose:** Keep architecture docs in sync with code.

**Process:**
1. Trigger on post-merge
2. Read recent merged PRs' diffs
3. Use AI to infer:
   - New endpoints
   - New agent types
   - Database schema changes
4. Rewrite `ARCHITECTURE_MAP.generated.yaml`
5. Auto-commit with `[skip ci]`

**Limit:** Skips if diff > 50KB or < 10 bytes

### 14. Epistemic Ledger (`epistemic_ledger_auto_adr.mjs`)

**Purpose:** Auto-generate ADRs for significant merges.

**Process:**
1. Trigger on significant merges (500-50,000 bytes)
2. Use AI to extract Context, Decision, Consequences
3. Generate markdown ADR → `docs/governance/decisions/ADR-<timestamp>.md`
4. Auto-commit with `[skip ci]`

### 15. FinOps Governor (`finops_governor.mjs`)

**Purpose:** Detect AI agent thrashing (infinite loops).

**Detection:**
- 5+ unmerged PRs from same author in 24h
- 4+ touches of same file without merge

**Action:** Label as `queue:blocked,finops-halt`

### 16. Test Impact Analyzer (`test_impact_analyzer.mjs`)

**Purpose:** Selectively run only affected tests.

**Process:**
1. Analyze changed files
2. Query available test files
3. Use AI to predict impact
4. Output `artifacts/matrix.json` for GitHub Actions
5. Skip CI entirely for docs-only changes

**Efficiency:** Reduces 10,000s of tests to only necessary ones

## GitHub Actions Workflows

### 1. **Master Orchestrator** (`.github/workflows/master-orchestrator.yml`)
- **Trigger:** Every 2 hours + manual dispatch
- **Duration:** ~60 minutes
- **Runs:** All 15 pillars in sequence

### 2. **PR Intake Processor** (`.github/workflows/pr-intake-processor.yml`)
- **Trigger:** Every 15 minutes + PR events
- **Duration:** ~15 minutes
- **Runs:** Auto-concern, classifier, canonical selector

### 3. **Mass Harvest Cycle** (`.github/workflows/mass-harvest-cycle.yml`)
- **Trigger:** Every 4 hours + manual dispatch
- **Duration:** ~45 minutes
- **Runs:** Mass harvest train only

### 4. **Self-Healing Loop** (`.github/workflows/self-healing-loop.yml`)
- **Trigger:** Daily at 2 AM UTC + after master orchestrator
- **Duration:** ~30 minutes
- **Runs:** SAFE, meta-librarian, entropy hunter, AI tech lead
- **Auto-commits:** Learning updates to `.learnings/`

### 5. **Circuit Breaker** (`.github/workflows/circuit-breaker.yml`)
- **Trigger:** When main CI fails
- **Duration:** ~10 minutes
- **Runs:** Circuit breaker (auto-revert)

## Artifact Outputs

```
artifacts/
├── orchestration-cycle.json        # Master orchestrator results
├── omni-recovery-summary.md        # Recovery cycle report
├── recovery_requests.json          # Queue for semantic slicer / AI tech lead
├── harvest/
│   ├── harvest_manifest.json       # Absorbed/ejected PRs
│   ├── harvest-summary.md          # Harvest report
│   └── harvest_body.md             # Integration PR body
├── conflicts/
│   └── pr-*.diff                   # Diff files for complex conflicts
├── supersedence-*.json             # Supersedence analysis
├── pr-frontier-summary.md          # Frontier policy violations
├── pr-concern-hints-summary.md     # Concern enforcement report
└── matrix.json                     # Dynamic test matrix
```

## Configuration

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `REPO` | ✅ | GitHub repository (owner/repo) |
| `GITHUB_TOKEN` | ✅ | GitHub API access |
| `OPENAI_API_KEY` | ⚠️ | AI conflict resolution (fallback) |
| `ANTHROPIC_API_KEY` | ⚠️ | AI primary provider |
| `GEMINI_API_KEY` | ⚠️ | AI tertiary fallback |
| `DRY_RUN` | ❌ | Set to `true` for simulation |
| `BATCH_SIZE` | ❌ | Omni-recovery batch size (default: 10) |
| `HARVEST_MAX_BATCH_SIZE` | ❌ | Harvest batch size (default: 50) |
| `SUPERSEDENCE_MIN_SCORE` | ❌ | Supersedence threshold (default: 0.78) |
| `FRONTIER_STRICT` | ❌ | Fail on violations (default: true) |

### GitHub Actions Secrets

Set these in repository settings → Secrets and variables → Actions:

```
OPENAI_API_KEY      # Optional: OpenAI API key
ANTHROPIC_API_KEY   # Optional: Anthropic API key
GEMINI_API_KEY      # Optional: Google Gemini API key
```

`GITHUB_TOKEN` is provided automatically by GitHub Actions.

## Manual Execution

### Run Full Cycle Locally
```bash
REPO="BrianCLong/summit" \
GITHUB_TOKEN="$(gh auth token)" \
node scripts/orchestrator/master_orchestrator.mjs
```

### Run Individual Scripts
```bash
# Auto-detect concerns
REPO="..." GITHUB_TOKEN="..." node scripts/orchestrator/auto_concern_detector.mjs

# Classify PRs
REPO="..." GITHUB_TOKEN="..." node scripts/orchestrator/pr-classifier.mjs

# Select canonical survivors
REPO="..." GITHUB_TOKEN="..." node scripts/orchestrator/canonical_survivor_selector.mjs

# Run omni-recovery
REPO="..." GITHUB_TOKEN="..." node scripts/orchestrator/omni_rebase_recovery.mjs

# Mass harvest
REPO="..." GITHUB_TOKEN="..." node scripts/orchestrator/mass_harvest_train.mjs
```

### Dry Run Mode
```bash
DRY_RUN=true REPO="..." GITHUB_TOKEN="..." \
node scripts/orchestrator/master_orchestrator.mjs
```

## Monitoring

### Check Queue State
```bash
gh pr list --label "queue:merge-now"
gh pr list --label "queue:needs-rebase"
gh pr list --label "queue:conflict"
gh pr list --label "queue:blocked"
gh pr list --label "queue:obsolete"
```

### Check Canonical Survivors
```bash
gh pr list --label "canonical-survivor"
```

### View Orchestration History
```bash
cat artifacts/orchestration-cycle.json | jq '.phases[] | {phase, successful: ([.steps[] | select(.success)] | length)}'
```

### Check Learning Progress
```bash
cat .learnings/AGENT_DIRECTIVES.md
cat .learnings/GOLDEN_CONTEXT.md
```

## Troubleshooting

### No PRs Being Labeled
- Check if PRs have `/concern` declarations
- Run `auto_concern_detector.mjs` manually
- Verify `GITHUB_TOKEN` has `repo` scope

### Omni-Recovery Finding 0 PRs
- Most PRs may have deleted branches
- Check `gh pr list --state closed --limit 10` for reachable branches
- Try with open PRs only

### Mass Harvest Finding No PRs
- No PRs in `queue:merge-now` state
- Run `canonical_survivor_selector.mjs` to promote PRs
- Ensure canonical survivors are mergeable

### AI Conflict Resolution Failing
- No AI keys configured → Falls back to union merge
- Set `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
- Check API key validity

### Workflows Not Running
- Check if workflows are enabled: `gh workflow list`
- Verify cron schedule syntax
- Check GitHub Actions quota/limits

## System Health Metrics

**Target State (Fully Operational):**
- `queue:merge-now`: 5-50 PRs
- `canonical-survivor`: 10-30 PRs
- Harvest cycle: 20-50 PRs/batch
- Learning updates: Daily commits to `.learnings/`
- Zero PRs older than 7 days without action

**Current State Indicators:**
- `queue:blocked`: Should trend toward 0
- `queue:conflict`: Should be actively processed by omni-recovery
- `superseded`: Should match non-canonical PRs in concern clusters

## Scaling

The system is designed for 10,000+ PRs/day:
- **Batch processing:** Harvest processes 50 PRs in parallel
- **AI optimization:** Uses cheapest model for simple tasks
- **Selective CI:** Test impact analysis reduces compute cost
- **Incremental learning:** SAFE loop appends rules, doesn't retrain

**Cost Optimization:**
- FinOps governor prevents AI thrashing
- Union merge fallback if no AI keys
- Caching in meta-librarian compression

## Future Enhancements

- Real-time conflict notification (currently async/batched)
- Cross-PR dependency analysis with visual tooling
- Rollback automation (currently manual revert)
- Agent performance dashboard (FinOps governor tracks but no UI)
- Multi-repo orchestration

---

**Generated:** 2026-03-06
**Version:** 1.0.0
**Maintainer:** Summit AI Engineering OS
