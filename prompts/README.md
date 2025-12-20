# IntelGraph Prompt System

Enterprise-grade AI agent prompt bundle for the Summit/IntelGraph platform.

---

## Overview

This directory contains the full set of AI agent prompts used across:

- **Summit** - Core platform infrastructure
- **IntelGraph** - Intelligence analysis engine
- **Maestro Conductor** - AI orchestration layer
- **Company Switchboard** - Enterprise integration hub
- **Merge Train Ops** - CI/CD automation
- **Infrastructure** - Platform services

Each agent prompt is stored as a standalone file, and the Meta-Router chooses the correct agent automatically based on task characteristics.

---

## Prompt Files

### Core Agent Prompts

| File | Agent | Purpose |
|------|-------|---------|
| `claude-code.md` | Claude Code | Deep architectural reasoning, third-order inference |
| `codex.md` | Codex | Deterministic strict code generation |
| `jules-gemini.md` | Jules/Gemini | Cross-file schema alignment, multimodal |
| `cursor-warp.md` | Cursor/Warp | Terminal/editor integration, devloop |
| `summit-platform.md` | Summit | Enterprise architecture compliance |
| `ci-cd-enforcement.md` | CI/CD | Pipeline enforcement, quality gates |

### Orchestration & Governance

| File | Purpose |
|------|---------|
| `meta-router.md` | Agent selection and task routing logic |
| `capability-matrix.md` | Agent capability mapping for routing decisions |
| `enterprise-4th-order.md` | Enterprise governance layer (applies to all agents) |

### Existing Persona Prompts

| File | Persona | Purpose |
|------|---------|---------|
| `architect.md` | Guy | High-level technical decisions, architectural standards |
| `hermes.md` | Hermes | CI/CD, release management, PR workflows |
| `orion.md` | Orion | Task-specific agent |
| `aegis.md` | Aegis | Security-focused agent |
| `elara.md` | Elara | Task-specific agent |

### Workflow Templates

| File | Purpose |
|------|---------|
| `plan.feature-request@v1.yaml` | Feature request planning |
| `implement.fix-test@v1.yaml` | Test fix implementation |
| `review.security-check@v1.yaml` | Security review checklist |
| `code.critic@v1.yaml` | Code review template |

---

## Usage

### For Developers

Reference these prompts when working with AI assistants:

```bash
# Include prompt context in your request
"Following the claude-code.md prompt, implement..."

# Or reference specific constraints
"Apply enterprise-4th-order.md governance to this change..."
```

### For Maestro Conductor

The routing system uses these prompts automatically:

1. Task received by Meta-Router
2. Capability Matrix consulted
3. Appropriate agent selected
4. Task transformed with agent-specific prompt
5. Enterprise governance layer applied

### For CI/CD Systems

Prompts are validated in CI:

```bash
pnpm test -- prompts/__tests__/prompt-integrity.test.ts
```

---

## Order of Requirements

The prompt system enforces four orders of requirements:

```
┌─────────────────────────────────────────────┐
│  4th Order: Enterprise Governance           │
│  - Security, compliance, operations         │
│  ┌───────────────────────────────────────┐  │
│  │  3rd Order: Architecture/Ecosystem    │  │
│  │  - Integration, observability, CI/CD  │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │  2nd Order: Implied Requirements│  │  │
│  │  │  - Tests, types, configs, docs  │  │  │
│  │  │  ┌───────────────────────────┐  │  │  │
│  │  │  │  1st Order: Explicit Reqs │  │  │  │
│  │  │  │  - What the user asked    │  │  │  │
│  │  │  └───────────────────────────┘  │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## Prompt Packs

The `packs/` directory contains composable prompt fragments:

| File | Purpose |
|------|---------|
| `base.system.txt` | Base system context |
| `code.system.txt` | Code generation context |
| `cypher.system.txt` | Neo4j Cypher query context |
| `research.system.txt` | Research task context |
| `structured.system.txt` | Structured output context |
| `summary.system.txt` | Summarization context |
| `terse.system.txt` | Concise output context |
| `common.user.txt` | Common user context |

---

## Adding New Prompts

1. Create a new `.md` file in this directory
2. Follow the existing format with clear sections
3. Include execution markers (`BEGIN EXECUTION`, etc.)
4. Add to the capability matrix if it's an agent prompt
5. Add test coverage in `__tests__/`

### Prompt Structure Template

```markdown
# Agent Name — Brief Description

You are [Agent Name], [brief role description].

---

## Core Responsibilities

1. Responsibility 1
2. Responsibility 2
3. ...

---

## Execution Rules

- Rule 1
- Rule 2
- ...

---

## Output Format

[Define expected output structure]

---

## BEGIN EXECUTION.
```

---

## Validation

Prompts are validated for:

- Presence of required files
- Non-empty content
- Execution markers present
- Schema compliance (for YAML prompts)

Run validation:

```bash
pnpm test -- prompts/__tests__/prompt-integrity.test.ts
```

---

## Governance

### Updates

- All prompt changes require code review
- Security-related prompts require security team approval
- Major changes require architecture review

### Versioning

- YAML prompts use `@v1`, `@v2` versioning
- Markdown prompts track changes via git history
- Breaking changes require new version

---

## Related Documentation

- [CLAUDE.md](/CLAUDE.md) - Codebase conventions
- [docs/Copilot-Playbook.md](/docs/Copilot-Playbook.md) - AI usage guide
- [docs/ARCHITECTURE.md](/docs/ARCHITECTURE.md) - System architecture

---

## Maintenance

**Owner**: Engineering Team
**Review Cadence**: Quarterly or as needed

This README should be updated when:
- New prompts are added
- Agent capabilities change
- Routing logic is modified
- Governance requirements evolve
