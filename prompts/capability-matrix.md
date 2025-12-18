# Agent Capability Matrix

This document maps agent capabilities to use cases for the Maestro Conductor routing system.

---

## Capability Overview

| Agent | Primary Strengths | Ideal Use Cases |
|-------|-------------------|-----------------|
| Claude Code | Deep reasoning, architecture, third-order inference | Complex features, cross-module behavior, design decisions |
| Codex | Deterministic strict code generation | Critical-path features, high-risk code, CI-bound work |
| Jules/Gemini | Cross-file, multimodal, schema harmonization | Refactors, dataflow fixes, large coherent features |
| Cursor/Warp | Terminal + editor integration, devloop ops | Live coding, rapid iteration, environment changes |
| Summit Platform | Enterprise-wide multi-service architecture | IntelGraph/Maestro/Summit ecosystem changes |
| CI/CD Enforcement | Pipeline correctness, gating, provenance | Build systems, release flows, quality guardrails |

---

## Detailed Capability Breakdown

### Claude Code

**Strengths:**
- Long-context reasoning
- Architectural pattern recognition
- Implicit requirement inference
- Third-order implication analysis
- Complex dependency resolution

**Best For:**
- New feature architecture
- System design decisions
- Cross-cutting concerns
- Security-sensitive code
- API design

**Avoid When:**
- Simple bug fixes
- Routine refactoring
- Boilerplate generation

---

### Codex

**Strengths:**
- Deterministic output
- Strict typing adherence
- Convention compliance
- Zero-error first attempts
- Comprehensive test generation

**Best For:**
- Production-critical code
- Type-heavy implementations
- Test suite development
- Config file generation
- Boilerplate with precision

**Avoid When:**
- Exploratory design
- Architecture decisions
- Creative problem solving

---

### Jules/Gemini

**Strengths:**
- Multi-file coherence
- Schema synchronization
- Type propagation
- Refactoring at scale
- Dataflow analysis

**Best For:**
- Large refactors
- Schema migrations
- API versioning
- Type system changes
- Cross-module updates

**Avoid When:**
- Single-file changes
- Quick fixes
- Terminal operations

---

### Cursor/Warp

**Strengths:**
- Editor integration
- Terminal command generation
- Rapid iteration
- Real-time feedback
- Devloop optimization

**Best For:**
- Interactive development
- Quick prototyping
- Environment setup
- Build/test commands
- Debug sessions

**Avoid When:**
- Architectural decisions
- Large refactors
- Complex reasoning needed

---

### Summit Platform

**Strengths:**
- Enterprise architecture compliance
- Multi-service coordination
- Platform convention enforcement
- Security/audit compliance
- Observability integration

**Best For:**
- Platform-wide changes
- New service creation
- Cross-service features
- Policy updates
- Infrastructure changes

**Avoid When:**
- Isolated features
- Non-platform code
- External integrations

---

### CI/CD Enforcement

**Strengths:**
- Pipeline correctness
- Quality gate design
- Release automation
- Failure prevention
- Merge safety

**Best For:**
- Workflow updates
- Test infrastructure
- Release processes
- Quality improvements
- Pipeline optimization

**Avoid When:**
- Feature development
- Bug fixes
- Non-CI code changes

---

## Selection Heuristics

### By Task Type

| Task Type | Primary Agent | Backup Agent |
|-----------|---------------|--------------|
| New feature | Claude Code | Jules/Gemini |
| Bug fix | Codex | Cursor/Warp |
| Refactor | Jules/Gemini | Claude Code |
| Schema change | Jules/Gemini | Summit Platform |
| Pipeline change | CI/CD Enforcement | Codex |
| Quick iteration | Cursor/Warp | Codex |
| Design review | Claude Code | Summit Platform |

### By Risk Level

| Risk Level | Recommended Agent | Rationale |
|------------|-------------------|-----------|
| Critical | Codex | Zero-error guarantee |
| High | Claude Code | Deep reasoning |
| Medium | Jules/Gemini | Balanced approach |
| Low | Cursor/Warp | Rapid iteration |

---

## Integration with Maestro Conductor

The capability matrix guides the Meta-Router in selecting the optimal agent for each task. The router uses this matrix to:

1. Match task characteristics to agent strengths
2. Consider risk level and complexity
3. Account for codebase context
4. Optimize for success probability

---

This matrix should be updated as agent capabilities evolve.
