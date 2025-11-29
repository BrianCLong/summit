# Enterprise AI Agent Prompt System

Complete enterprise-grade AI agent prompt bundle for Summit, IntelGraph, Maestro Conductor, and all related systems.

## Purpose

Enables autonomous AI agents to deliver production-grade code with:
- 100% requirement coverage (explicit, implicit, architectural)
- Zero TODOs or incomplete work
- Fully green CI on first submission
- Merge-ready output
- Principal engineer-level quality

## Agent Prompts

### Core Agents
- **`claude-code.md`** - Deep architectural reasoning with third-order inference
- **`codex.md`** - Deterministic zero-error build systems
- **`jules-gemini.md`** - Cross-file schema harmonization
- **`jules-universal-pattern-recognizer.md`** - Universal pattern recognition and meta-abstraction
- **`cursor-warp.md`** - Live devloop integration

### Enterprise Agents
- **`summit-intelgraph.md`** - Multi-service enterprise architecture
- **`ci-cd.md`** - Pipeline enforcement and governance

### Orchestration
- **`meta-router.md`** - Automatic agent selection
- **`capability-matrix.md`** - Agent capability mapping
- **`enterprise-4th-order.md`** - Governance layer

## Usage

```bash
# Copy template for new task
cp prompts/claude-code.md .agentic-prompts/task-123-feature.md

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
