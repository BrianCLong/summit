# Workflow Automation Guide

## Complete Agentic Task Workflow

### Phase 1: Task Initialization (5 minutes)

```bash
# 1. Select appropriate agent prompt
cp prompts/claude-code.md .agentic-prompts/task-[ID]-[name].md

# 2. Edit with specific requirements
# Add:
# - Explicit requirements
# - Context and constraints
# - Success criteria
# - Affected systems

# 3. Commit task prompt
git add .agentic-prompts/task-[ID]-[name].md
git commit -m "task: Initialize task [ID] - [name]"
```

### Phase 2: Claude Code Execution (1-2 hours)

1. **Load Task into Claude Code**
   - Open task prompt file
   - Provide additional context if needed
   - Let Claude analyze requirements

2. **Claude Implements**
   - All code changes
   - All tests (unit + integration)
   - All documentation
   - All configuration updates
   - Migration scripts (if needed)

3. **Claude Self-Validates**
   - Runs internal quality gates
   - Verifies CI compatibility
   - Confirms completeness
   - Ensures zero TODOs

### Phase 3: Local Verification (10 minutes)

```bash
# Run complete quality check
pnpm check

# This executes:
# - pnpm install
# - pnpm build
# - pnpm lint
# - pnpm typecheck
# - pnpm test

# If all pass:
git add -A
git commit -m "feat: [description]

- Complete implementation
- Full test coverage
- Documentation updated

Closes #[ID]"

git push origin feat/task-[ID]
```

### Phase 4: PR Creation (5 minutes)

```bash
# Create PR with comprehensive description
gh pr create \
  --title "feat: [description]" \
  --body-file .prbodies/task-[ID]-pr-body.md \
  --label "ready-for-review" \
  --label "auto-merge-candidate"

# Watch CI
gh run watch
```

### Phase 5: Review and Merge (10-30 minutes)

```bash
# If CI is green and review approved:
gh pr merge --auto --squash

# If changes needed:
# - Address feedback
# - Push updates
# - Re-verify CI
```

### Phase 6: Session Archival (2 minutes)

```bash
# Archive completed task
mkdir -p .agentic-prompts/archived/$(date +%Y-%m)
mv .agentic-prompts/task-[ID]-[name].md \
   .agentic-prompts/archived/$(date +%Y-%m)/

# Update metrics
echo "$(date +%Y-%m-%d): Task [ID] completed" >> .agentic-prompts/velocity.log

# Commit archive
git add .agentic-prompts/archived .agentic-prompts/velocity.log
git commit -m "chore: Archive completed task [ID]"
git push
```

## Parallel Session Management

### Running 3-5 Tasks Simultaneously

```bash
# Terminal 1: High-priority feature
Claude Code Session A
├─ Task: feat/auth-improvements
├─ Priority: P0
└─ ETA: 2 hours

# Terminal 2: Bug fix
Claude Code Session B
├─ Task: fix/memory-leak
├─ Priority: P1
└─ ETA: 1 hour

# Terminal 3: Refactoring
Claude Code Session C
├─ Task: refactor/type-system
├─ Priority: P2
└─ ETA: 3 hours
```

### PR Queue Management

```bash
# Review PRs in priority order
gh pr list --label "ready-for-review" | while read pr; do
  # Quick review
  gh pr view $pr
  
  # If approved
  gh pr review $pr --approve
  gh pr merge $pr --auto --squash
done
```

## Velocity Metrics

### Daily Tracking

```bash
# Log completed tasks
echo "$(date +%Y-%m-%d %H:%M): Task [ID] - [time_to_pr] - [time_to_merge]" \
  >> .agentic-prompts/velocity.log

# Generate daily report
cat .agentic-prompts/velocity.log | \
  grep "$(date +%Y-%m-%d)" | \
  wc -l
# Target: 3-5 tasks per day
```

### Weekly Analysis

```bash
# Analyze velocity trends
pnpm run analyze:velocity

# Outputs:
# - Tasks completed
# - Average time to PR
# - Average time to merge
# - CI pass rate
# - Merge conflict rate
```

## Quality Assurance Integration

### Automated Quality Gates

Every task automatically passes through:

```yaml
Code Quality:
  - TypeScript strict: PASS
  - ESLint: PASS (zero warnings)
  - Prettier: PASS
  - No console.log: PASS
  - No commented code: PASS

Test Quality:
  - Unit coverage: >90%
  - Integration tests: PRESENT
  - Edge cases: COVERED
  - Error paths: COVERED
  - Deterministic: PASS

Documentation Quality:
  - JSDoc: COMPLETE
  - README: UPDATED
  - CHANGELOG: UPDATED
  - Migration guide: PRESENT (if needed)

Architecture Quality:
  - Patterns: FOLLOWED
  - Performance: CONSIDERED
  - Security: REVIEWED
  - Scalability: CONSIDERED

Integration Quality:
  - CI pipeline: GREEN
  - Merge conflicts: NONE
  - Dependencies: UPDATED
  - Configs: UPDATED
```

## Troubleshooting

### Issue: CI Fails
```bash
# 1. Check CI logs
gh run view --log-failed

# 2. Fix locally
pnpm check

# 3. Push fix
git add -A
git commit -m "fix: Address CI failure"
git push

# 4. Verify
gh run watch
```

### Issue: Quality Gate Not Met
```bash
# 1. Identify failing gate
pnpm check 2>&1 | grep "FAIL"

# 2. Fix issue
# - Update code
# - Add missing tests
# - Complete documentation

# 3. Re-validate
pnpm check
```

### Issue: Merge Conflicts
```bash
# 1. Update from main
git fetch origin main
git rebase origin/main

# 2. Resolve conflicts
# (use editor)

# 3. Continue rebase
git add -A
git rebase --continue

# 4. Re-run tests
pnpm test

# 5. Force push
git push --force-with-lease
```

## Best Practices

### Task Scoping
- **Sweet spot**: 1-3 hour tasks
- **Too large**: Break into sub-tasks
- **Too small**: Batch with related work

### Prompt Engineering
- Be specific about requirements
- Provide clear success criteria
- Identify edge cases upfront
- Reference existing patterns

### PR Management
- Create PRs when ready, not "almost ready"
- Include comprehensive descriptions
- Link to related issues
- Provide testing evidence

### Session Management
- Archive completed sessions promptly
- Document learnings
- Update metrics
- Review weekly for patterns

## Success Indicators

✅ **Velocity**: 15-25 tasks per week  
✅ **Quality**: >95% CI pass rate  
✅ **Confidence**: Team trusts changes  
✅ **Impact**: Measurable business value  
✅ **Sustainability**: Velocity increasing over time  

---

**Move fast without breaking things!** 🚀
