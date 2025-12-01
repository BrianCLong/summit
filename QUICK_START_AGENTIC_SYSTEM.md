# Quick Start: Agentic Task Execution System

## 🚀 Get Started in 5 Minutes

### 1. Initialize Your First Task

```bash
# Run the initialization script
./scripts/agentic/init-task.sh

# It will ask:
# - Task ID: 1
# - Task name: my-first-task  
# - Agent choice: 1 (Claude Code)

# This creates:
# .agentic-prompts/task-1-my-first-task.md
```

### 2. Edit Task Requirements

The task file opens automatically. Add your requirements:

```markdown
## Task Requirements
- Implement user authentication endpoint
- Add JWT token generation
- Include refresh token logic
- Add rate limiting
- Full test coverage
- Update API documentation
```

### 3. Execute with Claude Code

1. Open Claude Code (claude.ai/code)
2. Upload the task prompt file
3. Add any additional context
4. Let Claude deliver complete implementation

### 4. Verify Locally

```bash
# Run all quality checks
pnpm check

# Should see:
# ✓ Build: PASS
# ✓ Lint: PASS
# ✓ Typecheck: PASS
# ✓ Tests: PASS
```

### 5. Create PR

```bash
# Stage and commit
git add -A
git commit -m "feat: implement user authentication

- Add JWT authentication endpoint
- Add refresh token logic  
- Add rate limiting middleware
- Add comprehensive tests
- Update API documentation

Closes #1"

# Push and create PR
git push origin feat/task-1
gh pr create --fill --label "ready-for-review"
```

### 6. Archive When Merged

```bash
# After PR merges
./scripts/agentic/archive-task.sh 1

# It will ask:
# - Time to PR: 90
# - Time to merge: 20

# Auto-archives and logs velocity
```

## 📊 Check Your Velocity

```bash
./scripts/agentic/report-velocity.sh

# Shows:
# - Today's completed tasks
# - This week's completed tasks
# - Average time to PR
# - Target comparison
```

## 🧠 Agent Selection Made Easy

```bash
./scripts/agentic/select-agent.sh

# Interactive wizard asks:
# - Multiple services? → Summit Superprompt
# - CI/CD related? → CI/CD Superprompt
# - Live terminal? → Cursor/Warp
# - Cross-file refactor? → Jules/Gemini
# - Critical code? → Codex
# - Complex architecture? → Claude Code
```

## 📝 Complete Example Workflow

### Task: Add Rate Limiting to API

```bash
# Step 1: Initialize
./scripts/agentic/init-task.sh
# ID: 42
# Name: rate-limiting
# Agent: 1 (Claude Code)

# Step 2: Edit requirements
vim .agentic-prompts/task-42-rate-limiting.md

# Step 3: Load into Claude Code
# (upload file to claude.ai/code)

# Claude delivers:
# - src/middleware/rate-limiter.ts
# - src/middleware/__tests__/rate-limiter.test.ts
# - src/config/rate-limits.ts
# - docs/api/rate-limiting.md
# - Updated: src/server.ts
# - Updated: README.md
# - Updated: CHANGELOG.md

# Step 4: Verify
pnpm check
# All green ✓

# Step 5: Commit and push
git add -A
git commit -m "feat: add rate limiting middleware"
git push origin feat/task-42
gh pr create --fill

# Step 6: Wait for CI (2-3 minutes)
gh run watch
# CI passes ✓

# Step 7: Merge (or wait for review)
gh pr merge --auto --squash

# Step 8: Archive
./scripts/agentic/archive-task.sh 42
# Time to PR: 75
# Time to merge: 15
# ✓ Archived

# Total time: 90 minutes from start to merged! 🎉
```

## 🎯 Target Metrics

### Daily Goals
- **3-5 tasks completed**
- **<2 hours average time to PR**
- **>95% CI pass rate**

### Weekly Goals
- **15-25 tasks completed**
- **>90% first-time merge rate**
- **Zero TODOs in code**
- **Increasing velocity trend**

## 🛠️ Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `init-task.sh` | Create new task prompt | `./scripts/agentic/init-task.sh` |
| `archive-task.sh` | Archive completed task | `./scripts/agentic/archive-task.sh <id>` |
| `report-velocity.sh` | Show velocity metrics | `./scripts/agentic/report-velocity.sh` |
| `select-agent.sh` | Agent selection wizard | `./scripts/agentic/select-agent.sh` |

## 📚 Learn More

- **Agent Prompts**: `prompts/README.md`
- **Capability Matrix**: `prompts/capability-matrix.md`
- **Workflow Guide**: `prompts/workflow-automation.md`
- **Meta-Router**: `prompts/meta-router.md`

## ❓ Troubleshooting

### Scripts don't execute
```bash
# Make scripts executable
chmod +x scripts/agentic/*.sh
```

### Can't find gh command
```bash
# Install GitHub CLI
brew install gh
# or: https://cli.github.com/
```

### Quality checks fail
```bash
# Run individually to identify issue
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

---

**Start your first task now and join the high-velocity development workflow!** 💪
