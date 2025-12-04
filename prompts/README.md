# Enterprise AI Agent Prompt System

This directory contains the complete enterprise-grade AI agent prompt bundle for Summit, IntelGraph, Maestro Conductor, and all related systems.

## Directory Structure

### `core/`
Foundational schemas, charters, and capability matrices that define the system's operating parameters.
- `schema.json`: Validation schema for prompt files.
- `capability-matrix.md`: Mapping of agent capabilities.

### `agents/`
Persona and system definitions for specific agents.
- **`claude-code.md`**: Deep architectural reasoning with third-order inference.
- **`codex.md`**: Deterministic zero-error build systems.
- **`jules-gemini.md`**: Cross-file schema harmonization and global optimization.
- **`summit-intelgraph.md`**: Multi-service enterprise architecture.
- **`ci-cd.md`**: Pipeline enforcement and governance.
- **`meta-router.md`**: Automatic agent selection.
- **`enterprise-4th-order.md`**: Governance layer.

### `workflows/`
Procedural YAML prompts for specific tasks.
- `code.critic@v1.yaml`
- `implement.fix-test@v1.yaml`
- `plan.feature-request@v1.yaml`
- `review.security-check@v1.yaml`

## Purpose

Enables autonomous AI agents to deliver production-grade code with:
- 100% requirement coverage (explicit, implicit, architectural)
- Zero TODOs or incomplete work
- Fully green CI on first submission
- Merge-ready output
- Principal engineer-level quality

## Usage

```bash
# Copy template for new task
cp prompts/agents/claude-code.md .agentic-prompts/task-123-feature.md

# Edit with requirements
vim .agentic-prompts/task-123-feature.md

# Load into AI assistant and execute
```

## Target Metrics
- 3-5 complete tasks per day
- <2 hours time to PR
- >95% CI pass rate
- >90% first-time merge rate
- Zero TODOs

## Testing

```bash
pnpm test prompts/__tests__
```
