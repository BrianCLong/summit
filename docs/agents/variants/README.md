# Agent Variant Superprompts

> **Version**: 1.0.0
> **Last Updated**: 2025-11-27
> **Purpose**: Platform-optimized superprompts for AI coding agents operating on the Summit/IntelGraph codebase

## Overview

This directory contains specialized superprompts tailored for different AI coding agents and platforms. Each variant is optimized to leverage the unique strengths and architectural capabilities of its target agent while maintaining consistent quality standards for Summit/IntelGraph development.

### Design Philosophy

All variants enforce a **Third-Order Execution Model**:

| Order | Scope | Description |
|-------|-------|-------------|
| **1st-Order** | Explicit | Direct instructions stated in the specification |
| **2nd-Order** | Implicit | Everything required to fulfill 1st-order: types, schemas, tests, configs, infra |
| **3rd-Order** | Systemic | Logical implications: integrations, security, observability, migrations, CI/CD |

### Quality Gates

Every superprompt enforces these non-negotiable standards:

- **100% correct** — No bugs, no logical errors
- **100% type-checked** — Full TypeScript strict compliance
- **100% tested** — Unit, integration, and contract tests
- **100% documented** — Inline comments, API docs, README updates
- **100% lint-clean** — ESLint, Prettier conformance
- **100% CI-green** — All workflows pass
- **100% merge-clean** — No conflicts, clean git history
- **0 TODOs** — No placeholders, stubs, or incomplete implementations

---

## Available Variants

| Variant | Target Agent | Optimization Focus |
|---------|--------------|-------------------|
| [Claude Code](./claude-code-superprompt.md) | Claude (Anthropic) | Strategic reasoning, architectural synthesis, third-order implications |
| [Codex](./codex-superprompt.md) | OpenAI Codex | Deterministic output, strict correctness, engineering precision |
| [Jules/Gemini](./jules-gemini-superprompt.md) | Google Gemini Code | Multi-file refactoring, cross-context synthesis, multimodal awareness |
| [Warp/Cursor](./warp-cursor-superprompt.md) | Terminal/IDE Agents | Dev-loop optimization, command generation, continuous delivery |
| [Summit/IG](./summit-ig-superprompt.md) | Enterprise Context | Monorepo-aware, compliance-first, full ecosystem integration |
| [CI-Aware](./ci-aware-superprompt.md) | Pipeline Integration | GitHub Actions, merge-train compatibility, provenance tracking |

---

## Usage Guidelines

### 1. Selecting the Right Variant

Choose based on your context:

- **Claude Code**: Complex architectural changes, cross-cutting concerns, security-sensitive features
- **Codex**: Deterministic transformations, API implementations, strict type safety requirements
- **Jules/Gemini**: Large-scale refactors, multi-file updates, context-heavy analysis
- **Warp/Cursor**: Interactive development, rapid iteration, terminal-based workflows
- **Summit/IG**: Enterprise features, compliance requirements, multi-service orchestration
- **CI-Aware**: Pipeline changes, release engineering, merge-train operations

### 2. Applying a Superprompt

1. Copy the full prompt from the appropriate variant file
2. Replace any placeholders (e.g., `<FEATURE_NAME>`, `<SERVICE_PATH>`)
3. Append your specific requirements after the `---` separator
4. Include relevant context from the codebase

### 3. Validating Output

All agent outputs must pass the standard validation chain:

```bash
# Full validation sequence
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck

# Golden path verification
make smoke
```

---

## Integration with Summit Workflows

### Maestro Conductor Integration

Agent-generated code can be submitted to Maestro for orchestrated review:

```yaml
# Example workflow step
- name: ai-code-review
  type: agent-review
  config:
    variant: claude-code
    enforcement: strict
    gates:
      - type-safety
      - test-coverage
      - security-scan
```

### Provenance Tracking

All agent-generated changes must include provenance metadata:

```typescript
// Provenance header (auto-injected by agent gateway)
/**
 * @generated-by: claude-code
 * @session-id: <SESSION_ID>
 * @prompt-hash: <PROMPT_HASH>
 * @timestamp: <ISO_TIMESTAMP>
 */
```

### Policy Enforcement

Agent outputs are subject to OPA policy validation:

- `policy/agents/code-generation.rego` — Code quality gates
- `policy/agents/security-review.rego` — Security compliance
- `policy/agents/merge-eligibility.rego` — Merge train admission

---

## Creating Custom Variants

To create a project-specific variant:

1. Start with the base template closest to your use case
2. Customize the **Execution Rules** section for project-specific patterns
3. Update the **Deliverables** section with required artifacts
4. Add project-specific **Validation Steps**
5. Register the variant in this README

### Variant Template Structure

```markdown
# [AGENT NAME] Superprompt: "[TAGLINE]"

## Primary Directive
[Core objective and quality standards]

## Execution Rules
[Agent-specific behavioral constraints]

## Deliverables
[Required outputs and artifacts]

## Coding Standards
[Project-specific conventions]

## Final Validation
[Pre-output verification steps]

## Begin Implementation
[Trigger phrase]
```

---

## Metrics & Observability

Agent performance is tracked via:

- **Prometheus**: `intelgraph_agent_generation_*` metrics
- **Grafana**: `Agent Productivity Dashboard`
- **Audit Logs**: `services/audit-log/schemas/agent-activity.json`

Key metrics:
- Generation success rate
- First-try compilation rate
- Test pass rate
- Review cycle count
- Time to merge

---

## Related Documentation

- [CLAUDE.md](/CLAUDE.md) — Main AI assistant guide
- [Agent Gateway](/services/agent-gateway/README.md) — Agent orchestration service
- [Replit/Lovable Prompts](/docs/integrations/replit-lovable-codex-prompts.md) — IDE integration prompts
- [Link Analysis Canvas](/docs/agents/link-analysis-canvas-master-prompt.md) — Investigation workflow prompts
- [Copilot Playbook](/docs/Copilot-Playbook.md) — AI copilot usage guide

---

## Changelog

### v1.0.0 (2025-11-27)
- Initial release with 6 agent variants
- Third-order execution model standardized
- Summit/IG enterprise variant added
- CI-aware pipeline integration variant added
