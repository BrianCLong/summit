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

### Prime Directive Agent
- **`ultra-prime-recursive-meta-extrapolative.md`** - Maximum extrapolation, complete perfection, zero-defect delivery

### Core Agents
- **`claude-code.md`** - Deep architectural reasoning with third-order inference
- **`codex.md`** - Deterministic zero-error build systems
- **`jules-gemini.md`** - Cross-file schema harmonization
- **`cursor-warp.md`** - Live devloop integration

### Enterprise Agents
- **`summit-intelgraph.md`** - Multi-service enterprise architecture
- **`ci-cd.md`** - Pipeline enforcement and governance

### Orchestration
- **`meta-router.md`** - Automatic agent selection (includes ultra-prime routing)
- **`capability-matrix.md`** - Agent capability mapping (includes ultra-prime metrics)
- **`enterprise-4th-order.md`** - Governance layer (inherited by ultra-prime)

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

## Ultra-Prime Agent Tools

The ultra-prime agent includes additional tooling for maximum effectiveness:

### Engine Implementation
- **`tools/ultra-prime-engine.ts`** - TypeScript implementation of recursive meta-extrapolation
- **`scripts/ultra-prime-orchestrator.ts`** - CLI orchestrator for automated invocation

### Examples and Documentation
- **`examples/ultra-prime-examples.md`** - Comprehensive use cases and benchmarks
- **`__tests__/ultra-prime-validation.test.ts`** - Extensive validation test suite

### Usage

```bash
# Interactive mode
ts-node prompts/scripts/ultra-prime-orchestrator.ts --interactive

# From file
ts-node prompts/scripts/ultra-prime-orchestrator.ts --file request.txt

# Inline request
ts-node prompts/scripts/ultra-prime-orchestrator.ts "Design distributed tracing system"

# With verbose output
ts-node prompts/scripts/ultra-prime-orchestrator.ts --verbose --format both "Add health checks"
```

### When to Use Ultra-Prime

✅ **Use for:**
- Greenfield projects requiring architectural vision
- Mission-critical implementations
- Comprehensive research tasks
- Zero-tolerance-for-gaps scenarios

❌ **Don't use for:**
- Quick fixes (use Codex)
- Rapid iteration (use Cursor/Warp)
- Simple implementations (use Claude Code)

## Testing

```bash
# All prompt integrity tests
pnpm test prompts/__tests__

# Ultra-prime validation specifically
pnpm test prompts/__tests__/ultra-prime-validation.test.ts
```
