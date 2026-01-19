# Weekly Signal Checklist - Jan 2026

Based on "This week's signal for Summit" report.

## 1. Architecture

- [ ] **Refactor Model Interface**
  - Goal: Cleanly swap between Frontier API, 7–15B Self-hosted (e.g., Falcon-H1R), and SLMs for micro-tasks.
  - Context: Use existing `LLMRouter` and `ProviderAdapter` with enhanced tagging/policy.
  - Source: [8], [1]

- [ ] **Elevate Agent Identity**
  - Goal: First-class identity, permissions, and audit logging in Maestro/Conductor.
  - Context: Machine identities and "who did what" are critical for regulated users.
  - Source: [5]

## 2. Product & GTM

- [ ] **Draft "Execution-Era AI" Positioning**
  - Goal: Position Summit as the *execution fabric* for intel teams (measurable outcomes, fast governance).
  - Artifact: `docs/narrative/EXECUTION_ERA_POSITIONING.md`
  - Source: [2], [3]

- [ ] **Summit for CIO/CISO One-Pager**
  - Goal: Highlight metric-driven workflows, agent identity/audit, and fit into cloud stacks.
  - Artifact: `docs/gtm/SUMMIT_CIO_CISO_ONE_PAGER.md`
  - Source: [3], [4], [5]

- [ ] **Production Reference Blueprint**
  - Goal: AWS-native production template (Helm + GitHub Actions + policies).
  - Context: Make Summit look like a platform, not a toolkit.
  - Source: [4], [3]

## 3. Research & Scouting

- [ ] **Evaluate Falcon-H1R-class Models**
  - Goal: Shortlist 1-2 "analysis-grade but deployable" models (7-15B) for air-gapped deployments.
  - Candidates: Falcon-H1R, Qwen variants.
  - Source: [1]

- [ ] **SLM Micro-tasks**
  - Goal: Carve out 3-5 micro-tasks (URL triage, entity extraction) for SLMs.
  - Source: [1]

- [ ] **Physical/Action Models**
  - Goal: Evaluate VLA (Vision-Language-Action) models for future "acting agent" patterns.
  - Source: [1]
