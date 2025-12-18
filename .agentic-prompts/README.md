# Agentic Prompts Directory

Task-specific prompts for AI coding assistants (Claude Code, Codex, Jules, etc.).

## Structure

```
.agentic-prompts/
  README.md                    # This file
  velocity.log                 # Task completion metrics
  task-[ID]-[name].md         # Active task prompts
  archived/                    # Completed task prompts
    YYYY-MM/
      task-[ID]-[name].md
```

## Workflow

### 1. Create Task Prompt
```bash
cp prompts/claude-code.md .agentic-prompts/task-456-new-feature.md
```

### 2. Edit with Requirements
- Add specific requirements
- Define success criteria
- List affected systems
- Note constraints

### 3. Execute with AI Assistant
- Load prompt into Claude Code/Codex/etc.
- Let AI deliver complete implementation
- Verify quality gates pass

### 4. Create PR
```bash
gh pr create --fill
```

### 5. Archive When Merged
```bash
mkdir -p archived/$(date +%Y-%m)
mv task-456-new-feature.md archived/$(date +%Y-%m)/
```

## Templates

All agent prompt templates are in `../prompts/`:
- `claude-code.md` - For complex architectural work
- `codex.md` - For deterministic critical code
- `jules-gemini.md` - For cross-file refactoring
- `cursor-warp.md` - For devloop integration
- `summit-intelgraph.md` - For multi-service work
- `ci-cd.md` - For pipeline changes

See `../prompts/meta-router.md` for agent selection guidance.

## Metrics

Target performance:
- 3-5 tasks per day
- <2 hours to PR
- >95% CI pass rate
- >90% first-time merge rate

## Best Practices

1. **One prompt per task** - Keep focused
2. **Archive when done** - Keep directory clean
3. **Log completion** - Track velocity
4. **Review weekly** - Identify patterns
5. **Improve templates** - Evolve based on learnings
